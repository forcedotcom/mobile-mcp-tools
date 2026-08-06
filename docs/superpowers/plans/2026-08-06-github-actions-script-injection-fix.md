# GitHub Actions Script Injection Fix (W-23650040) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the GitHub Actions script-injection vulnerability (CWE-94) in `base-publish-release.yml` by moving every `${{ ... }}`-interpolated value out of the `actions/github-script` body and into `env:` + `process.env`, and apply the same convention to the same-shaped (currently non-exploitable) interpolations in `base-create-release.yml` for defense-in-depth.

**Architecture:** No new files, no new dependencies. Two existing reusable workflow files (`base-publish-release.yml`, `base-create-release.yml`) are edited in place: each `${{ inputs.* }}` / `${{ github.workspace }}` expression that currently appears inside a `script:` or `run:` body is replaced by an `env:` entry on that step, read back via `process.env.X` (JS) or `"$X"` (shell). No wrapper workflow is touched.

**Tech Stack:** GitHub Actions YAML, `actions/github-script@v7` (Node.js `process.env`), POSIX shell `run:` steps.

## Global Constraints

- Never interpolate `${{ ... }}` context directly into a `script:` or `run:` body — always bind via `env:` and read via `process.env.X` / `"$X"` (spec Root Cause).
- `process.env.DRY_RUN` is a string once passed through `env:` — the orchestrator call must do `dryRun: process.env.DRY_RUN === 'true'`, not a bare boolean (spec Scope §1).
- Use `process.env.GITHUB_WORKSPACE` (set automatically by the runner) instead of interpolating `${{ github.workspace }}` into the dynamic `import()` (spec Scope §1, §2).
- The six per-package wrapper workflows (`mcp-workflow-*`, `mobile-native-mcp-server-*`, `mobile-web-*`) are out of scope and must not be modified (spec Scope, Out of scope).
- No new input validation/sanitization is introduced — the fix is the env passthrough itself (spec Non-goals).
- No `actionlint` installation — static checks in this plan use plain `python3`/`yaml` parsing (spec Non-goals).

---

### Task 1: Fix `base-publish-release.yml` (primary, exploitable bug)

**Files:**
- Modify: `.github/workflows/base-publish-release.yml:54-69`

**Interfaces:**
- Produces: the `publish-release` job's `Publish release using orchestrator` step, with `env:` keys `PACKAGE_PATH`, `PACKAGE_DISPLAY_NAME`, `RELEASE_TAG`, `NPM_TAG`, `DRY_RUN` (plus the existing `GITHUB_TOKEN`) — consumed as-is by Task 3's live dry-run.

- [ ] **Step 1: Write the regression check (as a temp file) that currently fails**

Create `/tmp/check-publish-injection.py`:

```python
import re

text = open(".github/workflows/base-publish-release.yml").read()

bad_patterns = {
    "packagePath interpolated":        r"packagePath:\s*'\$\{\{",
    "packageDisplayName interpolated": r"packageDisplayName:\s*'\$\{\{",
    "releaseTag interpolated":         r"releaseTag:\s*'\$\{\{",
    "npmTag interpolated":             r"npmTag:\s*'\$\{\{",
    "dryRun interpolated":             r"dryRun:\s*\$\{\{",
    "github.workspace interpolated":   r"import\('\$\{\{\s*github\.workspace",
}

found = [name for name, pat in bad_patterns.items() if re.search(pat, text)]

if found:
    print("FAIL: found unconverted interpolation(s):", found)
else:
    print("PASS: no interpolation found in script body")
```

- [ ] **Step 2: Run it to verify it currently fails (violation present)**

Run: `python3 /tmp/check-publish-injection.py`
Expected: `FAIL: found unconverted interpolation(s): ['packagePath interpolated', 'packageDisplayName interpolated', 'releaseTag interpolated', 'npmTag interpolated', 'dryRun interpolated', 'github.workspace interpolated']`

- [ ] **Step 3: Apply the fix**

Replace `.github/workflows/base-publish-release.yml` lines 54-69 (the `Publish release using orchestrator` step) with:

```yaml
      - name: Publish release using orchestrator
        uses: actions/github-script@v7
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PACKAGE_PATH: ${{ inputs.package_path }}
          PACKAGE_DISPLAY_NAME: ${{ inputs.package_display_name }}
          RELEASE_TAG: ${{ inputs.release_tag }}
          NPM_TAG: ${{ inputs.npm_tag }}
          DRY_RUN: ${{ inputs.dry_run }}
        with:
          script: |
            const { createReleaseOrchestrator } = await import(`${process.env.GITHUB_WORKSPACE}/packages/project-maintenance-utilities/dist/index.js`);

            const orchestrator = createReleaseOrchestrator(context);
            await orchestrator.publishRelease({
              packagePath: process.env.PACKAGE_PATH,
              packageDisplayName: process.env.PACKAGE_DISPLAY_NAME,
              releaseTag: process.env.RELEASE_TAG,
              npmTag: process.env.NPM_TAG,
              dryRun: process.env.DRY_RUN === 'true'
            });
```

The rest of the file (lines 1-53) is unchanged.

- [ ] **Step 4: Run the check again to verify it passes**

Run: `python3 /tmp/check-publish-injection.py`
Expected: `PASS: no interpolation found in script body`

- [ ] **Step 5: Validate the file is still valid YAML**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/base-publish-release.yml')); print('YAML OK')"`
Expected: `YAML OK`

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/base-publish-release.yml
git commit -m "fix: bind release_tag and related inputs via env instead of script interpolation

Fixes CWE-94 script injection in base-publish-release.yml — untrusted
workflow_dispatch input release_tag was spliced into the github-script
body via \${{ }} template expansion before JS execution. Values now
flow through env:/process.env, which never re-parses them as source."
```

---

### Task 2: Fix `base-create-release.yml` (defense-in-depth, same PR)

**Files:**
- Modify: `.github/workflows/base-create-release.yml:39-57`

**Interfaces:**
- Produces: `Build package` and `Run tests` steps reading `PACKAGE_PATH` via `env:`/`"$PACKAGE_PATH"`; `Create release using orchestrator` step reading `PACKAGE_PATH`/`PACKAGE_DISPLAY_NAME` via `env:`/`process.env` — consumed as-is by Task 3's live trigger.

- [ ] **Step 1: Write the regression check (as a temp file) that currently fails**

Create `/tmp/check-create-injection.py`:

```python
import re

text = open(".github/workflows/base-create-release.yml").read()

bad_patterns = {
    "build run interpolated":        r"run:\s*npx nx build \$\{\{",
    "test run interpolated":         r"run:\s*npx nx test \$\{\{",
    "packagePath interpolated":      r"packagePath:\s*'\$\{\{",
    "packageDisplayName interpolated": r"packageDisplayName:\s*'\$\{\{",
    "github.workspace interpolated": r"import\('\$\{\{\s*github\.workspace",
}

found = [name for name, pat in bad_patterns.items() if re.search(pat, text)]

if found:
    print("FAIL: found unconverted interpolation(s):", found)
else:
    print("PASS: no interpolation found in run/script bodies")
```

- [ ] **Step 2: Run it to verify it currently fails (violation present)**

Run: `python3 /tmp/check-create-injection.py`
Expected: `FAIL: found unconverted interpolation(s): ['build run interpolated', 'test run interpolated', 'packagePath interpolated', 'packageDisplayName interpolated', 'github.workspace interpolated']`

- [ ] **Step 3: Apply the fix**

Replace `.github/workflows/base-create-release.yml` lines 39-57 (the `Build package`, `Run tests`, and `Create release using orchestrator` steps) with:

```yaml
      - name: Build package
        env:
          PACKAGE_PATH: ${{ inputs.package_path }}
        run: npx nx build "$PACKAGE_PATH"

      - name: Run tests
        env:
          PACKAGE_PATH: ${{ inputs.package_path }}
        run: npx nx test "$PACKAGE_PATH"

      - name: Create release using orchestrator
        uses: actions/github-script@v7
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PACKAGE_PATH: ${{ inputs.package_path }}
          PACKAGE_DISPLAY_NAME: ${{ inputs.package_display_name }}
        with:
          script: |
            const { createReleaseOrchestrator } = await import(`${process.env.GITHUB_WORKSPACE}/packages/project-maintenance-utilities/dist/index.js`);

            const orchestrator = createReleaseOrchestrator(context);
            await orchestrator.createRelease({
              packagePath: process.env.PACKAGE_PATH,
              packageDisplayName: process.env.PACKAGE_DISPLAY_NAME
            });
```

The rest of the file (lines 1-38) is unchanged.

- [ ] **Step 4: Run the check again to verify it passes**

Run: `python3 /tmp/check-create-injection.py`
Expected: `PASS: no interpolation found in run/script bodies`

- [ ] **Step 5: Validate the file is still valid YAML**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/base-create-release.yml')); print('YAML OK')"`
Expected: `YAML OK`

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/base-create-release.yml
git commit -m "fix: bind package_path and related inputs via env in base-create-release.yml

Defense-in-depth for the same interpolation shape as
base-publish-release.yml (not currently exploitable — values are
hardcoded by wrapper workflows today — but converting closes the
anti-pattern uniformly so a future edit can't silently reopen it)."
```

---

### Task 3: Live verification on GitHub Actions

**Files:** none modified — this task exercises Tasks 1 and 2's changes on real GitHub Actions runners.

**Interfaces:**
- Consumes: the pushed branch `haifeng.li/W-23650040-gha-script-injection-base-publish-release` containing Task 1 and Task 2's commits.

- [ ] **Step 1: Push the branch**

```bash
git push -u origin haifeng.li/W-23650040-gha-script-injection-base-publish-release
```

- [ ] **Step 2: Trigger a dry-run publish**

```bash
gh workflow run mobile-web-publish-release.yml \
  --ref haifeng.li/W-23650040-gha-script-injection-base-publish-release \
  -f release_tag=mobile-web-mcp-server_v0.0.0-test \
  -f npm_tag=latest \
  -f dry_run=true
```

- [ ] **Step 3: Watch the run and confirm correct values reached the orchestrator**

```bash
gh run watch --exit-status $(gh run list --workflow=mobile-web-publish-release.yml --limit 1 --json databaseId -q '.[0].databaseId')
gh run view --log $(gh run list --workflow=mobile-web-publish-release.yml --limit 1 --json databaseId -q '.[0].databaseId') | grep -E "packagePath|packageDisplayName|releaseTag|npmTag|dryRun"
```

Expected: the log shows `packagePath: packages/mobile-web`, `packageDisplayName: Mobile Web MCP Server`, `releaseTag: mobile-web-mcp-server_v0.0.0-test`, `npmTag: latest`, `dryRun: true` (boolean, not the string `'true'`), and the run completes successfully with no injected-code side effects.

- [ ] **Step 4: Trigger a create-release run**

```bash
gh workflow run mobile-web-create-release.yml \
  --ref haifeng.li/W-23650040-gha-script-injection-base-publish-release
```

- [ ] **Step 5: Watch the run and confirm the build/test steps resolved the correct package path**

```bash
gh run watch --exit-status $(gh run list --workflow=mobile-web-create-release.yml --limit 1 --json databaseId -q '.[0].databaseId')
gh run view --log $(gh run list --workflow=mobile-web-create-release.yml --limit 1 --json databaseId -q '.[0].databaseId') | grep -E "nx build|nx test|packagePath|packageDisplayName"
```

Expected: `Build package` and `Run tests` steps run against `packages/mobile-web` (not an empty or literal `${{ inputs.package_path }}` string), and `Create release using orchestrator` logs `packagePath: packages/mobile-web`, `packageDisplayName: Mobile Web MCP Server`. The run completes successfully.

- [ ] **Step 6: Final regression guard — re-diff both changed files**

```bash
git diff origin/main -- .github/workflows/base-publish-release.yml .github/workflows/base-create-release.yml | grep -nE '^\+.*\$\{\{' | grep -vE '^\+\s+[A-Z_]+:\s*\$\{\{'
```

Expected: no output — every remaining `${{ ... }}` in the diff appears only as the right-hand side of an `env:` key assignment (e.g. `RELEASE_TAG: ${{ inputs.release_tag }}`), never inside a `script:` or `run:` body.

---

## Self-Review Notes

- **Spec coverage:** Scope §1 (base-publish-release.yml, all 6 interpolation points including `dryRun` string coercion and `GITHUB_WORKSPACE`) → Task 1. Scope §2 (base-create-release.yml `run:` steps + `github-script` step) → Task 2. Out-of-scope wrappers → untouched (no task modifies them). Testing/Verification items 1-4 from the spec → Task 1/2 Steps 4-5 (YAML validity + trace) and Task 3 (live dry-run + regression guard). Non-goals (no wrapper changes, no new validation, no actionlint) → respected throughout.
- **Placeholder scan:** no TBD/TODO; every step has literal, runnable commands or full YAML blocks.
- **Type/name consistency:** `env:` keys (`PACKAGE_PATH`, `PACKAGE_DISPLAY_NAME`, `RELEASE_TAG`, `NPM_TAG`, `DRY_RUN`) and their `process.env.*` / `"$PACKAGE_PATH"` consumers match 1:1 across Tasks 1-3; `dryRun: process.env.DRY_RUN === 'true'` matches the Global Constraint verbatim.
