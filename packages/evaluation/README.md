# Evaluation Package

This package provides tools for evaluating LWC (Lightning Web Component) generation quality using AI models.

## Overview

The evaluation system compares AI-generated LWC components against reference implementations to assess quality and accuracy. It uses two AI models:

1. **Judge Model**: Evaluates the quality of generated components
2. **Model to Evaluate**: Generates LWC components based on prompts

## Quick Start

### Prerequisites

1. Set up the required environment variables (see [Environment Variables](#environment-variables)) through 1password.
2. Ensure the mobile-web MCP server is available
3. Have evaluation datasets ready in the `dataset/` directory

### Running Evaluation

#### From Project Root

```bash
# Evaluate all available components
npm run evaluate

# Evaluate specific components
npm run evaluate:component qrCodeOnlyScanner

# Evaluate multiple components
npm run evaluate:component qrCodeOnlyScanner anotherComponent
```

#### From Evaluation Package Directory

```bash
cd packages/evaluation

# Evaluate all available components
npm run evaluate

# Evaluate specific components
npm run evaluate:component qrCodeOnlyScanner
```

#### Direct Script Execution

```bash
# From project root
tsx packages/evaluation/src/scripts/run-evaluation.ts

# From evaluation package directory
tsx src/scripts/run-evaluation.ts qrCodeOnlyScanner
```

## Environment Variables

The evaluation system at runtime requires the following environment variables to be set:

### Judge Model Configuration

- `JUDGE_MODEL` - Model name for evaluation
- `JUDGE_MODEL_PROVIDER` - Provider for judge model
- `JUDGE_MODEL_API_KEY` - API key for judge model
- `JUDGE_MODEL_BASE_URL` - Base URL for judge model
- `JUDGE_MODEL_CLIENT_FEATURE_ID` - Client feature ID for judge model
- `JUDGE_MODEL_TENANT_ID` - Tenant ID for judge model

### Model to Evaluate Configuration

- `MODEL_TO_EVAL` - Model name to evaluate
- `MODEL_TO_EVAL_PROVIDER` - Provider for model to evaluate
- `MODEL_TO_EVAL_API_KEY` - API key for model to evaluate
- `MODEL_TO_EVAL_BASE_URL` - Base URL for model to evaluate
- `MODEL_TO_EVAL_CLIENT_FEATURE_ID` - Client feature ID for model to evaluate
- `MODEL_TO_EVAL_TENANT_ID` - Tenant ID for model to evaluate

.env has these configuration value as 'op://....'. so setup 1password and get access to ADK shared values. slack channel: [#a4d-adk-help](https://salesforce.enterprise.slack.com/archives/C06A2J4AB2S)

## Dataset Structure

Evaluation datasets should be organized as follows:

```
dataset/
└── mobile-web/
    └── componentName/
        ├── component/
        │   ├── componentName.html
        │   ├── componentName.js
        │   └── componentName.js-meta.xml
        ├── prompt/
        │   └── prompt.md
        └── evalConfig.json
```

### Directory Structure Explanation

- **componentName/**: Directory named after the component being evaluated
- **component/**: Contains the reference LWC component files
- **prompt/**: Contains the prompt used to generate the LWC component
- **evalConfig.json**: Specifying evaluation type: lwc-generation or review-refactor, and mcp tool to call if needed

### Example evalConfig.json for lwc-generation evaluation

```json
{
  "mcpTools": [
    {
      "toolId": "sfmobile-web-barcode-scanner",
      "params": {}
    }
  ],
  "type": "lwc-generation"
}
```

### Example evalConfig.json for review-refactor evaluation

```json
{
  "type": "review-refactor"
}
```

## Output

The evaluation script provides:

1. **Real-time Progress**: Shows evaluation progress for each component
2. **Individual Scores**: Displays scores (0-10) for each component
3. **Detailed Feedback**: Shows evaluation details and reasoning
4. **Summary Report**: Provides overall statistics including:
   - Total components evaluated
   - Success/failure counts
   - Average score
   - Detailed results for each component

### Example Output

```
🚀 Starting LWC Component Evaluation
============================================================
🔧 Initializing evaluator...
✅ Evaluator initialized successfully
📝 Evaluating specified components: qrCodeOnlyScanner

🔍 Evaluating component: qrCodeOnlyScanner
✅ qrCodeOnlyScanner - Score: 8.5/10
   Details: Component correctly implements barcode scanning functionality with proper error handling

============================================================
📊 EVALUATION SUMMARY
============================================================
Total Components: 1
Successful Evaluations: 1
Failed Evaluations: 0
Average Score: 8.50/10

📋 Detailed Results:
------------------------------------------------------------
✅ PASSED qrCodeOnlyScanner: 8.5/10
   Component correctly implements barcode scanning functionality with proper error handling

🧹 Cleaning up...
✅ Cleanup completed
```

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**: Ensure all required environment variables are properly configured
2. **MCP Server Not Available**: Make sure the mobile-web MCP server can be started
3. **Dataset Not Found**: Verify that the component exists in the dataset directory
4. **API Connection Issues**: Check network connectivity and API credentials

## Development

### Adding New Components

1. Create a new directory in `dataset/mobile-web/` with the component name
2. Add the reference component files in the `component/` subdirectory
3. Create a `prompt/` directory with a `prompt.md` file containing the generation prompt
4. Add an `evalConfig.json` file specifying type of evaluation and mcp tools list if doing lwc-generation evaluation. review-refactor evaluation is hard-coded to call offline-guidance and offline analysis tools, no need specify mcp tool list.

### Extending the Evaluator

The evaluation system is designed to be extensible. You can:

1. Modify the `LwcEvaluatorAgent` to change evaluation criteria
2. Update the `LwcComponentAgent` to change generation behavior
3. Add new evaluation metrics in the `Evaluator` class
4. Extend the output format in the `run-evaluation.ts` script

## Contributing

When contributing to the evaluation system:

1. Follow the existing code structure and patterns
2. Add appropriate tests for new functionality
3. Update documentation for any new features
4. Ensure all environment variables are properly documented
5. Test with multiple components to ensure reliability
