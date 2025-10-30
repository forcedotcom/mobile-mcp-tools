# PRD Generation Workflow Architecture

## Overview

The PRD (Product Requirements Document) Generation Workflow is a comprehensive AI-powered system that orchestrates the creation of high-quality product requirements documents for Salesforce mobile native applications. This workflow implements a sophisticated iterative process that combines automated generation with human review to ensure requirements quality and completeness.

## Workflow Overview

> Note: once we have an abstracted workflow pattern this will be further broken down into smaller workflow (i.e. feature brief workflow, prd workflow)

### Phase 1: Initialization and Feature Brief
- **Initialize** project and extract user requirements
- **Generate** feature brief from user utterance
- **Review** feature brief with user approval

### Phase 2: Initial Requirements Generation
- **Generate** initial functional requirements from feature brief
- **Review** requirements with user/stakeholder approval

### Phase 3: Gap Analysis and Iteration
- **Analyze** gaps in requirements coverage
- **Control** iteration based on gap analysis score
- **Generate** additional requirements to address gaps (if needed)

### Phase 4: PRD Generation
- **Generate** comprehensive PRD document
- **Review** PRD for quality and completeness

### Phase 5: Finalization
- **Complete** workflow and mark as finalized

## Workflow Diagram

```mermaid
graph TD
    Start[START] --> Init[Magi Initialization]
    Init --> FB[Feature Brief Generation]
    FB --> FBReview[Feature Brief Review]
    FBReview -->|Not Approved| FBUpdate[Feature Brief Update]
    FBUpdate --> FBReview
    FBReview -->|Approved| IR[Initial Requirements Generation]
    IR --> RR[Requirements Review]
    RR --> GA[Gap Analysis]
    
    GA --> IC[Iteration Control]
    
    IC -->|Continue| GR[Gap Requirements Generation]
    IC -->|Stop| PG[PRD Generation]
    
    GR --> RR
    
    PG --> PR[PRD Review]
    
    PR -->|Approved| F[Finalization]
    PR -->|Not Approved| PG
    
    F --> End[END]
    
    Error[Failure Node] --> End
    
    style Error fill:#ffcccc,stroke:#ff0000
```

## Architecture Components

### Node Types

There are two base node classes in the PRD workflow:

> NOTE: there is a lot of overlap from the normal magen workflow here, these will be refactored in the future
> to share the same abstracted orchestrator/nodes.

1. **`PRDBaseNode`** - Base class for all nodes
   - Provides standard node name and execution interface
   - Used for state transformation without tool invocation

2. **`PRDAbstractToolNode`** - Extends `PRDBaseNode`
   - Adds tool execution capabilities
   - Provides standardized logging and error handling
   - Includes `executeToolWithLogging()` for safe tool invocation

## Node Details

### 1. Magi Initialization Node
**Class:** `PRDMagiInitializationNode`  
**Type:** Base Node (no tools)

**Purpose:** Initializes the PRD workflow by validating inputs and creating the necessary directory structure.

**Responsibilities:**
- Validates that `projectPath` is provided in user input
- Validates that `userUtterance` is provided
- Ensures the `magi-sdd` directory exists in the project
- Returns validated paths and user utterance

**Key State Updates:**
- Sets `projectPath` - the root project directory
- Sets `userUtterance` - the user's original request
- Sets `prdWorkspacePath` - path to the magi-sdd directory
- Sets `prdWorkflowFatalErrorMessages` - array of error messages if initialization fails

**Error Handling:**
- If `projectPath` is missing: sets `prdWorkflowFatalErrorMessages` and returns (router will route to failure)
- If `userUtterance` is missing: sets `prdWorkflowFatalErrorMessages` and returns (router will route to failure)
- If directory creation fails: sets `prdWorkflowFatalErrorMessages` with error details (router will route to failure)
- Node **does not throw errors** - instead populates error state and lets router handle routing to failure node

---

### 2. Feature Brief Generation Node
**Class:** `PRDFeatureBriefGenerationNode`  
**Type:** Tool Node  
**Tool:** `magi-prd-feature-brief`

**Purpose:** Generates a structured feature brief from the user's original utterance.

**Responsibilities:**
- Calls the feature brief generation tool
- Retrieves existing feature IDs to ensure uniqueness
- Creates feature directory structure
- Stores feature brief content in state (does NOT write to disk yet)
- Generates recommended feature ID

**Tool Input:**
```typescript
{
  userUtterance: string,
  currentFeatureIds: string[]
}
```

**Tool Output:**
```typescript
{
  featureBriefMarkdown: string,
  recommendedFeatureId: string
}
```

**Key State Updates:**
- Sets `featureId` - unique identifier for the feature
- Sets `featureBriefPath` - path where file will be written (after approval)
- Sets `featureBriefContent` - markdown content stored in-memory

**Output Files:**
- **Does NOT create file yet** - file is only written after approval in Review Node
- Directory is created: `{prdWorkspacePath}/{featureId}/`
- File path determined: `{prdWorkspacePath}/{featureId}/feature-brief.md`

**Note:** 
- This node is ONLY for initial generation. For iterations/updates, see Feature Brief Update Node.
- The feature brief file is **only written to disk after approval** in the Review Node.

---

### 3. Feature Brief Update Node
**Class:** `PRDFeatureBriefUpdateNode`  
**Type:** Tool Node  
**Tool:** `magi-prd-feature-brief-update`

**Purpose:** Updates an existing feature brief based on user feedback and modification requests from the review process. This node is specifically designed for iteration scenarios after a feature brief has been reviewed and not approved.

**Responsibilities:**
- Reads existing feature brief content from state (or file if it exists)
- Incorporates user feedback and requested modifications
- Stores updated content in state (does NOT write to disk yet)
- Maintains the same feature ID throughout iterations

**Tool Input:**
```typescript
{
  existingFeatureId: string, // Must be reused
  featureBrief: string, // Path to file OR content from state
  userUtterance: unknown, // Original utterance for context
  userFeedback?: string, // User feedback from review
  modifications?: Array<{
    section: string,
    modificationReason: string,
    requestedContent: string
  }> // Specific modification requests
}
```

**Tool Output:**
```typescript
{
  featureBriefMarkdown: string // Updated feature brief content
}
```

**Key State Updates:**
- Updates `featureBriefContent` in state (stores updated content)
- Preserves `featureId` and `featureBriefPath` (no changes)
- Clears review state after update

**Output Files:**
- **Does NOT write file yet** - file is only written after approval in Review Node
- Uses same file path: `{prdWorkspacePath}/{featureId}/feature-brief.md`

**Key Differences from Generation Node:**
- **Generation Node**: Creates new feature brief from scratch
- **Update Node**: Revises existing feature brief based on feedback
- **Update Node**: Always reuses existing directory and feature ID
- **Update Node**: Incorporates review feedback and modifications

---

### 4. Feature Brief Review Node
**Class:** `PRDFeatureBriefReviewNode`  
**Type:** Tool Node  
**Tool:** `magi-prd-feature-brief-review`

**Purpose:** Facilitates user review and approval of the generated feature brief before proceeding to requirements generation. Writes the feature brief file to disk only when approved.

**Responsibilities:**
- Presents feature brief content from state to user for review
- Captures approval/rejection/modification decisions
- Records user feedback
- Generates review summary
- **Writes feature brief file to disk when approved**

**Tool Input:**
```typescript
{
  featureBrief: string, // Path to feature brief file (or content if file doesn't exist)
  featureBriefContent?: string // Content from state (used when file doesn't exist yet)
}
```

**Tool Output:**
```typescript
{
  approved: boolean,
  userFeedback?: string,
  reviewSummary: string,
  modifications?: Array<{
    section: string,
    modificationReason: string,
    requestedContent: string
  }>
}
```

**Key State Updates:**
- Sets `isFeatureBriefApproved` - approval status
- Sets `featureBriefUserFeedback` - user feedback

**Workflow Behavior:**
- If approved → write feature brief file to disk, then proceed to initial requirements generation
- If modifications needed → route to Feature Brief Update Node (not Generation Node)
- All changes are documented for tracking

**File Writing:**
- **When approved**: Writes `featureBriefContent` from state to `featureBriefPath`
- **When not approved**: File is NOT written; content remains in state for iteration

---

### 5. Initial Requirements Generation Node
**Class:** `PRDInitialRequirementsGenerationNode`  
**Type:** Tool Node  
**Tool:** `magi-prd-initial-requirements`

**Purpose:** Analyzes the feature brief to propose initial functional requirements.

**Responsibilities:**
- Reads feature brief content from file
- Invokes initial requirements generation tool
- Proposes original functional requirements

**Tool Input:**
```typescript
{
  featureBrief: string // Feature brief content
}
```

**Tool Output:**
```typescript
{
  functionalRequirements: Array<{
    id: string,
    title: string,
    description: string,
    priority: 'high' | 'medium' | 'low',
    category: string
  }>,
  summary: string
}
```

**Key State Updates:**
- Sets `functionalRequirements` - array of proposed requirements
- Sets requirements summary

---

### 4. Requirements Review Node
**Class:** `PRDRequirementsReviewNode`  
**Type:** Tool Node  
**Tool:** `magi-prd-requirements-review`
**Artifact:** `{prdWorkspacePath}/{featureId}/requirements.md`

**Purpose:** Facilitates user/stakeholder review of functional requirements and **persists the results to a markdown file**.

**Responsibilities:**
- Presents requirements for review
- Captures approval/rejection/modification decisions
- **Creates and updates `requirements.md` after each review cycle to persist the cumulative state of all requirements.**
- **Maintains a review history within the artifact for traceability.**
- Records user feedback
- Generates review summary
- **Stores the artifact path in workflow state** (not the requirement data itself)

**Artifact Management:**
This node is responsible for managing the `requirements.md` artifact. After each review, it reads the existing file (if it exists), merges the new results, and writes the markdown file back to disk. It stores only the artifact path (`requirementsArtifactPath`) in workflow state, ensuring that subsequent nodes always read the latest version from disk. This approach maintains a single source of truth and prevents state staleness.

**Tool Input:**
```typescript
{
  functionalRequirements: Array<Requirement>
}
```

**Tool Output:**
```typescript
{
  approvedRequirements: Array<Requirement>,
  rejectedRequirements: Array<Requirement>,
  modifiedRequirements: Array<ModifiedRequirement>,
  reviewSummary: string,
  userFeedback: string
}
```

**Key State Updates:**
- **Does NOT store requirement data in state** - requirements are read from markdown file when needed
- Path to requirements.md is calculated on-demand using `resolveRequirementsArtifactPath()` utility

**Workflow Behavior:**
- User can approve, reject, or modify each requirement
- Modified requirements include notes on changes made
- All decisions are recorded for audit trail

---

### 5. Gap Analysis Node
**Class:** `PRDGapAnalysisNode`  
**Type:** Tool Node  
**Tool:** `magi-prd-gap-analysis`

**Purpose:** Analyzes requirements for gaps, incompleteness, and quality issues. Also captures user decision on whether to continue refining requirements.

**Responsibilities:**
- Compares approved requirements against feature brief
- Identifies missing functionality
- Scores requirement strengths and weaknesses
- Provides overall quality assessment
- Suggests improvements
- Asks the user whether to continue refining or proceed to PRD generation
- **Excludes rejected and out-of-scope requirements** from gap suggestions

**Tool Input:**
```typescript
{
  featureBrief: string, // Feature brief content
  requirementsContent: string // Content of requirements.md file (read by node)
}
```

**Tool Behavior:**
The node reads the `requirements.md` file content and passes it directly to the tool. The tool receives:
- Full markdown content of the requirements artifact
- Approved requirements (for gap analysis)
- Rejected requirements (to avoid suggesting again)
- Out-of-scope requirements (to avoid suggesting again)

The tool then performs gap analysis excluding explicitly rejected/out-of-scope items, focusing on approved and modified requirements.

**Tool Output:**
```typescript
{
  gapAnalysisScore: number, // Tool may return 0..1 or 0..100
  identifiedGaps: Array<{
    id: string,
    title: string,
    description: string,
    severity: 'critical' | 'high' | 'medium' | 'low',
    category: string,
    impact: string,
    suggestedRequirements: Array<SuggestedRequirement>
  }>,
  userWantsToContinueDespiteGaps?: boolean
}
```

**Key State Updates:**
- Sets `gapAnalysisScore` - overall gap analysis score (normalized internally)
- Sets `identifiedGaps` - array of identified gaps (excludes rejected/out-of-scope items)
- Sets `userIterationOverride` - user's decision to continue or proceed (optional)

**User Decision:**
After presenting gap analysis results, the tool asks the user whether to:
- Continue refining requirements to address identified gaps
- Proceed to PRD generation despite the gaps (useful when gaps are minor or acceptable)

The user's decision is captured in state as `userIterationOverride` (tool output is mapped from `userWantsToContinueDespiteGaps`).

---

### 6. Requirements Iteration Control Node
**Class:** `PRDRequirementsIterationControlNode`  
**Type:** Base Node (no tools)

**Purpose:** Determines whether to continue refining requirements or proceed to PRD generation based on gap analysis results and user preference.

**Responsibilities:**
- Evaluates gap analysis score
- Checks for explicit user decision
- Makes iteration control decision
- Implements quality threshold logic with user override capability

**Decision Logic:**
The node uses the following priority order:

1. **User Override (Highest Priority)**: If `userWantsToContinueDespiteGaps` is explicitly set:
   - `true` → always continue iteration
   - `false` → always proceed to PRD generation

2. **Automatic Threshold (Fallback)**: If no explicit user decision:
   - `shouldContinueIteration = gapAnalysisScore < 0.8` (80% threshold)

This ensures users have full control over the iteration process while maintaining sensible defaults.

**Implementation:**
```typescript
if (userWantsToContinue === true) {
  shouldContinueIteration = true;  // User wants to continue
} else if (userWantsToContinue === false) {
  shouldContinueIteration = false;  // User wants to proceed
} else {
  shouldContinueIteration = gapAnalysisScore < 0.8;  // Use threshold
}
```

**Key State Updates:**
- Sets `shouldContinueIteration` - boolean flag for iteration

**Control Flow:**
- If `shouldContinueIteration = true` → proceed to gap requirements generation
- If `shouldContinueIteration = false` → proceed to PRD generation

---

### 7. Gap Requirements Generation Node
**Class:** `PRDGapRequirementsGenerationNode`  
**Type:** Tool Node  
**Tool:** `magi-prd-gap-requirements`

**Purpose:** Generates additional functional requirements to address identified gaps.

**Responsibilities:**
- Uses gap analysis results to propose new requirements
- Ensures no duplication with existing approved requirements
- Ensures no duplication with rejected/out-of-scope requirements
- Addresses high/critical severity gaps first
- Integrates new requirements with existing ones

**Tool Input:**
```typescript
{
  featureBrief: string, // Feature brief content
  requirementsContent: string, // Content of requirements.md file (read by node)
  identifiedGaps: Array<Gap>
}
```

**Tool Behavior:**
The tool receives the `requirements.md` content directly and extracts:
- Approved requirements (to avoid duplicates)
- Rejected requirements (to avoid regenerating)
- Out-of-scope requirements (to avoid regenerating)
Then generates new requirements addressing gaps while avoiding all excluded items.

**Tool Output:**
```typescript
{
  functionalRequirements: Array<Requirement>,
  summary: string,
  gapsAddressed: string[] // Gap IDs addressed by these requirements
}
```

**Key State Updates:**
- Adds new requirements to `functionalRequirements`
- Updates requirements summary

**Workflow Behavior:**
- Generates new requirements based on gaps
- Uses suggested requirements from gap analysis as starting points
- Assigns appropriate priorities based on gap severity
- Returns to requirements review node after generation

---

### 8. PRD Generation Node
**Class:** `PRDGenerationNode`  
**Type:** Tool Node  
**Tool:** `magi-prd-generation`

**Purpose:** Generates the complete Product Requirements Document from approved requirements.

**Responsibilities:**
- Reads feature brief content
- Assembles all approved requirements from artifact
- Generates comprehensive PRD document
- Creates traceability table
- Sets document metadata

**Tool Input:**
```typescript
{
  originalUserUtterance: string,
  featureBrief: string, // Feature brief content
  requirementsContent: string // Content of requirements.md file (read by node)
}
```

**Tool Behavior:**
The tool receives the `requirements.md` content directly and extracts:
- Approved requirements (included in PRD)
- Modified requirements (included in PRD with modification notes)
Excluded items (rejected/out-of-scope) are not included in the PRD.

**Tool Output:**
```typescript
{
  prdContent: string, // Full markdown PRD content
  prdFilePath: string, // Output file path
  documentStatus: {
    author: string,
    lastModified: string, // YYYY-MM-DD format
    status: 'draft' | 'finalized'
  },
  requirementsCount: number,
  traceabilityTableRows: Array<{
    requirementId: string,
    technicalRequirementIds: string, // TBD placeholder
    userStoryIds: string // TBD placeholder
  }>
}
```

**Key State Updates:**
- Sets `prdContent` - full PRD markdown
- Sets `prdPath` - path to PRD file
- Sets `prdStatus` - document metadata

**PRD Structure:**
1. Document Status (author, date, status)
2. Original User Utterance
3. Feature Brief
4. Functional Requirements
5. Traceability Table

---

### 9. PRD Review Node
**Class:** `PRDReviewNode`  
**Type:** Tool Node  
**Tool:** `magi-prd-review`

**Purpose:** Facilitates final review and approval of the complete PRD document.

**Responsibilities:**
- Presents PRD document for review
- Captures approval/modification decisions
- Records user feedback
- Generates review summary

**Tool Input:**
```typescript
{
  prdContent: string, // PRD markdown content
  prdFilePath: string, // File path where PRD is located
  documentStatus: {
    author: string,
    lastModified: string,
    status: 'draft' | 'finalized'
  }
}
```

**Tool Output:**
```typescript
{
  prdApproved: boolean
}
```

**Key State Updates:**
- Sets `isPrdApproved` - approval status

**Workflow Behavior:**
- If approved → proceed to finalization
- If modifications needed → return to PRD generation for re-generation
- All changes are documented for tracking

---

### 10. Finalization Node
**Class:** `PRDFinalizationNode`  
**Type:** Base Node (no tools)

**Purpose:** Marks the PRD workflow as complete.

**Responsibilities:**
- Terminates workflow
- Returns to orchestrator

---

### 11. Failure Node
**Class:** `PRDFailureNode`  
**Type:** Tool Node  
**Tool:** `magi-prd-failure`

**Purpose:** Handles non-recoverable workflow failures and communicates them to the user.

**Responsibilities:**
- Invokes the PRD failure tool with error messages
- Formats failure information for user display
- Terminates workflow with error state

**Tool Input:**
```typescript
{
  messages: string[] // Array of error messages describing failures
}
```

**Tool Output:**
```typescript
{} // Empty result object, workflow terminates
```

**Key State Updates:**
- Reads `prdWorkflowFatalErrorMessages` from state
- Workflow terminates (routes to END)

**Error Handling Flow:**
1. Error occurs in any workflow node
2. Orchestrator catches the error and populates `prdWorkflowFatalErrorMessages` in state
3. Orchestrator routes execution to `prdFailureNode`
4. Failure node invokes the PRD failure tool to communicate the error to the user
5. Workflow terminates with error status

**Note:** Currently, no automatic recovery mechanisms are implemented. All errors are non-recoverable and result in workflow termination. Future enhancements may add retry logic or partial recovery capabilities.

---

## State Management

### PRD Workflow State

The workflow state (`PRDState`) is defined using LangGraph's `Annotation` API. State is organized into logical sections:

#### Core Workflow Data
```typescript
userInput: Record<string, unknown>
projectPath: string
featureId: string
prdWorkspacePath: string
userUtterance: string
```

#### Feature Brief State
```typescript
featureBriefPath: string // Path to feature-brief.md file (set after approval)
featureBriefContent: string // Feature brief markdown content (in-memory during review/iteration)
isFeatureBriefApproved: boolean // Whether the feature brief is approved
featureBriefUserFeedback: string // User feedback on the feature brief
featureBriefModifications: Array<Modification> // Requested modifications from review
```

#### Requirements State
```typescript
functionalRequirements: Array<Requirement> // Ephemeral - new proposals for review
```

**Note:** Requirement data (`approvedRequirements`, `modifiedRequirements`, `rejectedRequirements`) is **NOT stored in workflow state**. Instead, the workflow calculates the path to the `requirements.md` file using a shared utility function (`resolveRequirementsArtifactPath`) that derives it from the feature directory. Nodes pass this path to tools, which read and parse the markdown file directly. This ensures:
- Single source of truth (markdown file)
- No state staleness
- External edits are always picked up
- Collaboration-friendly workflow
- Simpler state (no path storage needed)

#### Gap Analysis State
```typescript
gapAnalysisScore: number // normalized internally
identifiedGaps: Array<Gap>
userIterationOverride: boolean
```

#### Iteration Control State
```typescript
shouldIterate: boolean
userIterationOverride: boolean
```

#### PRD Generation Results
```typescript
prdContent: string
prdPath: string
prdStatus: {
  author: string,
  lastModified: string,
  status: 'draft' | 'finalized'
}
```

#### PRD Review State
```typescript
isPrdApproved: boolean
```

#### Error Handling State
```typescript
prdWorkflowFatalErrorMessages: string[] // Array of error messages for failure communication
```

#### Requirements Artifact (`requirements.md`)
A markdown file that acts as the **single source of truth** for the state of all requirements for a given feature. It is managed exclusively by the `PRDRequirementsReviewNode` and read by all tools that need requirement data.

**Location:** `{prdWorkspacePath}/{featureId}/requirements.md`

**Purpose:**
- Human-readable and review-friendly format
- Supports collaborative editing and PR workflows
- Single source of truth for all requirement data
- Prevents workflow state staleness

**Structure:**
The markdown file contains structured sections for:
- Approved Requirements
- Modified Requirements (with modification notes)
- Rejected Requirements (with rejection reasons)
- Out-of-Scope Requirements (with scope exclusion reasons)
- Review History (optional, can be in separate file or embedded)

**Access Pattern:**
- Workflow nodes calculate the artifact path on-demand using `resolveRequirementsArtifactPath()` utility
- Utility derives path from `featureBriefPath` (if available) or `featureId` + `prdWorkspacePath`
- Tools receive the path and read/parse the markdown file directly
- This ensures tools always see the latest version, even if edited externally

## Flow Control

### Linear Edges
Simple linear progression with no branching:
1. START → Magi Initialization
2. Feature Brief Generation → Feature Brief Review
3. Feature Brief Update → Feature Brief Review (iteration loop)
4. Initial Requirements Generation → Requirements Review
5. Requirements Review → Gap Analysis
6. Gap Analysis → Requirements Iteration Control
7. PRD Generation → PRD Review
8. Finalization → END
9. Failure Node → END

### Conditional Edges
Branching logic based on state evaluation:

#### Magi Initialization → Feature Brief Generation or Failure
```typescript
.addConditionalEdges(magiInitializationNode.name, prdInitializationValidatedRouter.execute)
```

**Decision Logic:**
The `PRDInitializationValidatedRouter` checks if initialization was successful:
- If `prdWorkflowFatalErrorMessages` has any entries → route to Failure Node
- Otherwise → proceed to Feature Brief Generation

**Common Error Scenarios:**
- `projectPath` missing in user input
- `userUtterance` missing in user input
- Directory creation failures (permissions, disk space, etc.)

**Flow:**
- If errors present → Failure Node
- If no errors → Feature Brief Generation Node

---

#### Feature Brief Review → Update or Proceed
```typescript
.addConditionalEdges(featureBriefReviewNode.name, state => {
  const isApproved = state.isFeatureBriefApproved;
  return isApproved ? initialRequirementsGenerationNode.name : featureBriefUpdateNode.name;
})
.addEdge(featureBriefUpdateNode.name, featureBriefReviewNode.name)
```

**Decision Logic:**
The `isFeatureBriefApproved` flag is set by the Feature Brief Review Node based on user feedback:
- If `isFeatureBriefApproved = true` → proceed to Initial Requirements Generation
- If `isFeatureBriefApproved = false` → route to Feature Brief Update Node

**Flow:**
- If approved → Initial Requirements Generation Node
- If not approved → Feature Brief Update Node → Feature Brief Review Node (iteration loop)

**User Options:**
The user can:
- Approve the feature brief as-is
- Request modifications to specific sections
- Request a complete revision if the brief doesn't match their vision

**Iteration Loop:**
When modifications are requested:
1. Feature Brief Review → Feature Brief Update (with feedback/modifications)
2. Feature Brief Update → Feature Brief Review (user reviews updated version)
3. Process repeats until approved

---

#### Iteration Control → Gap Requirements or PRD Generation
```typescript
.addConditionalEdges(requirementsIterationControlNode.name, state => {
  const shouldIterate = state.shouldIterate;
  return shouldIterate ? gapRequirementsGenerationNode.name : prdGenerationNode.name;
})
```

**Decision Logic:**
The `shouldIterate` flag is determined by the Requirements Iteration Control Node using this priority:
1. **User Override**: If `userIterationOverride` is explicitly `true` or `false`, use that value
2. **Automatic Threshold**: If no explicit user decision, use gap score (< 80% continues iteration; internally normalized if tool returns 0..100)

**Flow:**
- If `shouldIterate = true` → generate gap-based requirements
- If `shouldIterate = false` → proceed to PRD generation

**Note:** Gap Analysis now always flows to Requirements Iteration Control, which makes the decision based on both gap score and user preference.

#### PRD Review → Finalization or PRD Generation
```typescript
.addConditionalEdges(prdReviewNode.name, state => {
  const isApproved = state.isPrdApproved;
  return isApproved ? prdFinalizationNode.name : prdGenerationNode.name;
})
```

**Decision:** If `isPrdApproved = true` → finalize workflow  
**Else:** Re-generate PRD document

#### Gap Requirements → Requirements Review
Loop back to review process:
```typescript
.addEdge(gapRequirementsGenerationNode.name, requirementsReviewNode.name)
```

## Integration with MCP Server

The PRD workflow is orchestrated by the `magi-prd-orchestrator` tool, which:
- Manages workflow state persistence
- Handles human-in-the-loop interruptions
- Coordinates tool invocations
- Provides status updates
- Maintains thread context

### Orchestrator Responsibilities
1. Start new PRD workflows
2. Resume interrupted workflows
3. Process tool results
4. Manage workflow state
5. Determine next node to execute
6. Generate orchestration instructions

### Human-in-the-Loop
The workflow supports interruptions at key points:
- **Requirements Review**: User reviews and approves requirements
- **Gap Analysis**: User can choose to continue refining requirements or proceed to PRD generation despite identified gaps
- **PRD Review**: User reviews and approves PRD

#### User Control Over Iteration
The `userIterationOverride` state field allows users to:
- **Override automatic decisions**: Users can explicitly decide to continue refining or proceed to PRD regardless of gap analysis score
- **Flexible workflow**: Enables users to balance thoroughness with time constraints
- **Informed decisions**: Gap analysis presents results before asking for user input, enabling informed choices
