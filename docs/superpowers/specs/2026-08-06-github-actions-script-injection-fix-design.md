# Design: Fix GitHub Actions Script Injection (W-23650040)

## Problem

`base-publish-release.yml` interpolates `${{ inputs.release_tag }}` — an unconstrained, free-form `workflow_dispatch` string — directly into a single-quoted JavaScript string literal inside an `actions/github-script` step's `script:` body. GitHub's template preprocessor expands `${{ ... }}` expressions as raw text *before* the script is parsed, so a `release_tag` containing a single quote closes the string literal and splices attacker-controlled code into the script's source text. This is CWE-94 (Improper Control of Generation of Code / "Code Injection").

The job requests `id-token: write` (OIDC), `contents: write`, and `packages: write`, and is invoked by three wrapper workflows with `secrets: inherit`. A successful injection can exfiltrate the npm publish token / abuse the OIDC identity, enabling supply-chain compromise (backdoored npm publishes of `mobile-web`, `mobile-native-mcp-server`, and `mcp-workflow`).

`base-create-release.yml` has the same-shaped interpolation (into both `run:` shell steps and a `github-script` body) but is not currently exploitable, because its only interpolated values (`package_path`, `package_display_name`, `github.workspace`) are hardcoded literals from the wrapper workflows, not free-form user input.

Full details, exploit walkthrough, and per-line audit are recorded on the GUS work item (`Details_and_Steps_to_Reproduce__c`).

## Root cause

Two phases, and the vulnerability is a phase-ordering defect:

1. **Template-expansion phase (pre-execution):** GitHub substitutes `${{ ... }}` expressions into the `script:`/`run:` body as raw text, producing the final source the step will run.
2. **Runtime phase:** the shell or `actions/github-script`'s JS engine parses and executes that assembled source.

Untrusted input crosses from data into *executable source text* during phase 1. Any validation attempted in phase 2 is already too late. The fix is to never let phase 1 touch a script/shell body with untrusted (or even currently-trusted-but-same-shaped) values — instead, bind values via the step's `env:` map and read them at runtime (`process.env.X` in JS, `"$X"` in shell), where they are inert data, never re-parsed as source.

## Scope

Both workflow files, in a single PR, applying one uniform convention:

### 1. `base-publish-release.yml` (exploitable — primary fix)

Convert the `Publish release using orchestrator` step's `github-script` body. Move every interpolated value into `env:`:

- `RELEASE_TAG` ← `${{ inputs.release_tag }}` (the exploitable value)
- `PACKAGE_PATH` ← `${{ inputs.package_path }}`
- `PACKAGE_DISPLAY_NAME` ← `${{ inputs.package_display_name }}`
- `NPM_TAG` ← `${{ inputs.npm_tag }}`
- `DRY_RUN` ← `${{ inputs.dry_run }}`
- Use `process.env.GITHUB_WORKSPACE` (provided automatically by the runner) instead of interpolating `${{ github.workspace }}` into the dynamic `import()`.

The script body reads all values from `process.env` instead of interpolated literals. Because `DRY_RUN` becomes a string once passed through `env:`, the call site must coerce it explicitly: `dryRun: process.env.DRY_RUN === 'true'`.

### 2. `base-create-release.yml` (defense-in-depth — same PR)

Same treatment, two step types:

- **`run:` shell steps** (`npx nx build ${{ inputs.package_path }}`, `npx nx test ${{ inputs.package_path }}`): add `env: { PACKAGE_PATH: ... }` to each step and reference `"$PACKAGE_PATH"` in the shell command instead of interpolating.
- **`github-script` step** (`Create release using orchestrator`): same pattern as above — `PACKAGE_PATH`, `PACKAGE_DISPLAY_NAME` via `env:`, read via `process.env`; `process.env.GITHUB_WORKSPACE` instead of `${{ github.workspace }}`.

### Out of scope

The six wrapper workflows (`mcp-workflow-*`, `mobile-native-mcp-server-*`, `mobile-web-*`, both `-create-release.yml` and `-publish-release.yml` variants) are **not modified**. They only pass `${{ inputs.* }}` into a called reusable workflow's `with:` block, which is data assignment (YAML), not body interpolation — not part of this defect class.

## Testing / Verification

1. **Static YAML validity** — after editing, parse both files (e.g. `python3 -c "import yaml; yaml.safe_load(open(f))"`) to confirm they remain valid YAML.
2. **Manual trace** — for each converted step, confirm every `env:` key has exactly one producer (`inputs.X` or `github.workspace`) and one consumer (`process.env.X` / `"$X"`), and that no `${{ }}` expression remains inside any `script:` or `run:` body in either file.
3. **Live dry-run** — push the branch and manually trigger one publish wrapper (e.g. `mobile-web-publish-release.yml`) via `gh workflow run` with `dry_run: true` and a realistic `release_tag`; confirm in the Actions log that the orchestrator receives the correct `packagePath`, `packageDisplayName`, `releaseTag`, `npmTag`, and `dryRun` (boolean, not string) with no injection side effects. Also trigger one create-release wrapper (e.g. `mobile-web-create-release.yml`) to confirm the build/test steps still resolve the correct package path. One of each is sufficient since all wrappers of a given kind funnel into the same base file.
4. **Regression guard** — re-diff the two changed files to confirm no `${{ inputs.* }}` or `${{ github.* }}` expression remains inside any `script:`/`run:` body.

## Non-goals

- No change to the six per-package wrapper workflows.
- No new validation/sanitization of `release_tag` or other inputs — the fix eliminates the trust-boundary crossing entirely (env passthrough), so runtime validation isn't needed to close this bug (though nothing here precludes adding it later for other reasons).
- No `actionlint` tooling installation — not currently in the repo; static check here is a plain YAML parse.
