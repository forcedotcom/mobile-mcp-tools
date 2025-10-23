There are two types of nodes that can be built:

- deterministic node
  This is a node that performs a task and continues the workflow without having to call out to a LLM tool. Look at EnvironmentValidationNode node for inspiration. When asked to generate a node create a new file that implements the BaseNode.. i.e.:

```
import { State } from '../metadata.js';
import { BaseNode } from './abstractBaseNode.js';
// import { Logger } from '../../logging/logger.js';
import path from 'path';

export class <NodeName>Node extends BaseNode {
  constructor() {
    //logger?: Logger
    super('<nodeId>');
  }

  execute = (state: State): Partial<State> => {
    // TODO: implement node logic and return state
    return state.
  };
}
```

- tool node
  This is a node that invokes a LLM tool call with guidance to the LLM to perform a task which is then instructed to call back into the LLM. Look at TemplateDiscoveryNode node for inspiration. When asked to generate a tool node, scaffold out the node and corresponding tool file. and stub everything out

  example

node:

```
import { MCPToolInvocationData } from '../../common/metadata.js';
import { State } from '../metadata.js';
import { AbstractToolNode } from './abstractToolNode.js';
import { <TOOL_NAME> } from '../../tools/workflow/<TOOL_NAME>/metadata.js';
import { ToolExecutor } from './toolExecutor.js';
import { Logger } from '../../logging/logger.js';

export class <TOOL_NAME>Node extends AbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('<TOOL_NAME>', toolExecutor, logger);
  }

  execute = (state: State): Partial<State> => {
    const toolInvocationData: MCPToolInvocationData<typeof <TOOL_NAME>.inputSchema> = {
      llmMetadata: {
        name: <TOOL_NAME>.toolId,
        description: <TOOL_NAME>.description,
        inputSchema:         description: <<TOOL_NAME>>.description,
.inputSchema,
      },
      input: {
        projectPath: state.projectPath,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
              description: <<TOOL_NAME>>.description,
.resultSchema
    );
    return validatedResult;
  };
}
```

Also scaffold the corresponding tool
