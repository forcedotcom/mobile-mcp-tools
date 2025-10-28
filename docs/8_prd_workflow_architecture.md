# PRD Generation Workflow Architecture

## Overview

The PRD (Product Requirements Document) Generation Workflow is a comprehensive AI-powered system that orchestrates the creation of high-quality product requirements documents for Salesforce mobile native applications. This workflow implements a sophisticated iterative process that combines automated generation with human review to ensure requirements quality and completeness.

## Workflow Overview

> Note: once we have an abstracted workflow pattern this will be further broken down into smaller workflow (i.e. feature brief workflow, prd workflow)

### Phase 1: Initialization and Feature Brief
- **Initialize** project and extract user requirements
- **Generate** feature brief from user utterance

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
    FB --> IR[Initial Requirements Generation]
    IR --> RR[Requirements Review]
    RR --> GA[Gap Analysis]
    
    GA -->|Score < threshold| IC[Iteration Control]
    GA -->|Score >= threshold| PG[PRD Generation]
    
    IC -->|Continue| GR[Gap Requirements Generation]
    IC -->|Stop| PG
    
    GR --> RR
    
    PG --> PR[PRD Review]
    
    PR -->|Approved| F[Finalization]
    PR -->|Not Approved| PG
    
    F --> End[END]
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
- Validates that `originalUserUtterance` is provided
- Ensures the `magi-sdd` directory exists in the project
- Returns validated paths and user utterance

**Key State Updates:**
- Sets `projectPath` - the root project directory
- Sets `originalUserUtterance` - the user's original request
- Sets `magiSddPath` - path to the magi-sdd directory

**Error Handling:**
- Throws error if `projectPath` is missing
- Throws error if `originalUserUtterance` is missing
- Throws error if directory creation fails

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
- Writes feature brief to disk
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
- Sets `featureBrief` - path to feature brief markdown file

**Output Files:**
- Creates: `{magiSddPath}/{featureId}/feature-brief.md`

---

### 3. Initial Requirements Generation Node
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
  projectPath: string,
  featureBrief: string
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

**Purpose:** Facilitates user/stakeholder review and approval of functional requirements.

**Responsibilities:**
- Presents requirements for review
- Captures approval/rejection/modification decisions
- Records user feedback
- Generates review summary

**Tool Input:**
```typescript
{
  projectPath: string,
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
- Sets `approvedRequirements` - requirements accepted by user
- Sets `rejectedRequirements` - requirements rejected by user
- Sets `modifiedRequirements` - requirements modified by user
- Sets `requirementsReviewSummary` - summary of review decisions

**Workflow Behavior:**
- User can approve, reject, or modify each requirement
- Modified requirements include notes on changes made
- All decisions are recorded for audit trail

---

### 5. Gap Analysis Node
**Class:** `PRDGapAnalysisNode`  
**Type:** Tool Node  
**Tool:** `magi-prd-gap-analysis`

**Purpose:** Analyzes requirements for gaps, incompleteness, and quality issues.

**Responsibilities:**
- Compares approved requirements against feature brief
- Identifies missing functionality
- Scores requirement strengths and weaknesses
- Provides overall quality assessment
- Suggests improvements

**Tool Input:**
```typescript
{
  projectPath: string,
  featureBrief: string,
  functionalRequirements: Array<Requirement>
}
```

**Tool Output:**
```typescript
{
  gapAnalysisScore: number, // 0-100
  identifiedGaps: Array<{
    id: string,
    title: string,
    description: string,
    severity: 'critical' | 'high' | 'medium' | 'low',
    category: string,
    impact: string,
    suggestedRequirements: Array<SuggestedRequirement>
  }>,
  recommendations: string[],
  summary: string
}
```

**Key State Updates:**
- Sets `gapAnalysisScore` - overall gap analysis score (0-100)
- Sets `identifiedGaps` - array of identified gaps
- Sets `requirementStrengths` - analysis of each requirement
- Sets `gapAnalysisRecommendations` - high-level recommendations
- Sets `gapAnalysisSummary` - summary of findings

---

### 6. Requirements Iteration Control Node
**Class:** `PRDRequirementsIterationControlNode`  
**Type:** Base Node (no tools)

**Purpose:** Determines whether to continue refining requirements or proceed to PRD generation.

**Responsibilities:**
- Evaluates gap analysis score
- Makes iteration control decision
- Implements quality threshold logic

**Decision Logic:**
```typescript
const shouldContinueIteration = gapAnalysisScore < 0.8; // 80% threshold
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
- Ensures no duplication with existing requirements
- Addresses high/critical severity gaps first
- Integrates new requirements with existing ones

**Tool Input:**
```typescript
{
  projectPath: string,
  featureBrief: string,
  existingRequirements: Array<Requirement>,
  identifiedGaps: Array<Gap>
}
```

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
- Assembles all approved requirements
- Generates comprehensive PRD document
- Creates traceability table
- Sets document metadata

**Tool Input:**
```typescript
{
  projectPath: string,
  originalUserUtterance: string,
  featureBrief: string,
  approvedRequirements: Array<Requirement>,
  modifiedRequirements: Array<ModifiedRequirement>
}
```

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
- Sets `prdFilePath` - path to PRD file
- Sets `prdDocumentStatus` - document metadata
- Sets `prdRequirementsCount` - number of requirements
- Sets `prdTraceabilityTableRows` - traceability data

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
  projectPath: string,
  prdContent: string,
  prdFilePath: string,
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
  prdApproved: boolean,
  prdModifications: Array<{
    section: string,
    originalContent: string,
    modifiedContent: string,
    modificationReason: string
  }>,
  userFeedback: string,
  reviewSummary: string
}
```

**Key State Updates:**
- Sets `prdApproved` - approval status
- Sets `prdModifications` - any modifications requested
- Sets `prdUserFeedback` - user feedback
- Sets `prdReviewSummary` - review summary

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

## State Management

### PRD Workflow State

The workflow state (`PRDState`) is defined using LangGraph's `Annotation` API. State is organized into logical sections:

#### Core Workflow Data
```typescript
userInput: Record<string, unknown>
projectPath: string
featureId: string
magiSddPath: string
originalUserUtterance: string
```

#### Feature Brief State
```typescript
featureBrief: string // Path to feature-brief.md file
```

#### Requirements State
```typescript
functionalRequirements: Array<Requirement>
approvedRequirements: Array<Requirement>
rejectedRequirements: Array<Requirement>
modifiedRequirements: Array<ModifiedRequirement>
requirementsReviewSummary: string
```

#### Gap Analysis State
```typescript
gapAnalysisScore: number // 0-100
identifiedGaps: Array<Gap>
gapAnalysisRecommendations: string[]
gapAnalysisSummary: string
```

#### Iteration Control State
```typescript
requirementsIterationCount: number
shouldContinueIteration: boolean
iterationComplete: boolean
userWantsToContinueDespiteGaps: boolean
```

#### PRD Generation Results
```typescript
prdContent: string
prdFilePath: string
prdDocumentStatus: {
  author: string,
  lastModified: string,
  status: 'draft' | 'finalized'
}
prdRequirementsCount: number
prdTraceabilityTableRows: Array<TraceabilityRow>
```

#### PRD Review State
```typescript
prdApproved: boolean
prdModifications: Array<PRDModification>
prdUserFeedback: string
prdReviewSummary: string
prdFinalized: boolean
```

## Flow Control

### Linear Edges
Simple linear progression with no branching:
1. START → Magi Initialization
2. Magi Initialization → Feature Brief Generation
3. Feature Brief Generation → Initial Requirements Generation
4. Initial Requirements Generation → Requirements Review
5. Requirements Review → Gap Analysis
6. PRD Generation → PRD Review
7. Finalization → END

### Conditional Edges
Branching logic based on state evaluation:

#### Gap Analysis → Iteration Control or PRD Generation
```typescript
.addConditionalEdges(gapAnalysisNode.name, state => {
  const shouldContinue = state.shouldContinueIteration;
  return shouldContinue ? requirementsIterationControlNode.name : prdGenerationNode.name;
})
```

**Decision:** If `shouldContinueIteration = true` → continue refining requirements  
**Else:** Proceed to PRD generation

#### Iteration Control → Gap Requirements or PRD Generation
```typescript
.addConditionalEdges(requirementsIterationControlNode.name, state => {
  const shouldContinue = state.shouldContinueIteration;
  return shouldContinue ? gapRequirementsGenerationNode.name : prdGenerationNode.name;
})
```

**Decision:** If `shouldContinueIteration = true` → generate gap-based requirements  
**Else:** Proceed to PRD generation

#### PRD Review → Finalization or PRD Generation
```typescript
.addConditionalEdges(prdReviewNode.name, state => {
  const isApproved = state.prdApproved;
  return isApproved ? prdFinalizationNode.name : prdGenerationNode.name;
})
```

**Decision:** If `prdApproved = true` → finalize workflow  
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
- **Gap Analysis**: User may choose to skip iteration
- **PRD Review**: User reviews and approves PRD
