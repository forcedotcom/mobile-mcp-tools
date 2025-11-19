# mobile-mcp-tools

**An open source monorepo for extensible Salesforce Mobile Model Context Protocol (MCP) servers and tools, maintained by the Mobile Platform Experience team.**

---

# Overview

Modern large language models (LLMs) often lack sufficient context about the APIs and development patterns available within the Salesforce Mobile Platform ecosystem. As a result, when users request the creation of mobile applications or components with platform-specific features, LLMs frequently generate heavily hallucinated or inaccurate solutions due to missing or incomplete API knowledge.

However, we've found that when a user queries the LLM to create mobile solutions, and the request is augmented with precise, context-specific information about the available APIs and development patterns, the accuracy and utility of the generated code from LLMs improves dramatically. Providing this "grounding context"—in the form of TypeScript types, API documentation, usage patterns, and platform-specific guidance—enables LLMs to produce exceptional, production-ready solutions tailored to the actual capabilities of the Salesforce Mobile Platform.

Model Context Protocol (MCP) server tools have emerged as the most effective avenue for delivering this kind of context-specific grounding to user requests. By exposing well-defined, discoverable API surfaces to MCP clients, these servers empower both LLMs and developers to generate and validate code that leverages real mobile platform capabilities.

The `mobile-mcp-tools` project is designed to address this need. It provides a robust, extensible monorepo for developing and publishing MCP servers and tools that deliver grounding context for Salesforce Mobile Platform development scenarios. The architecture is intentionally flexible to support multiple MCP servers and tools as the mobile development landscape evolves.

This project is designed to support the broader Model Context Protocol ecosystem by carefully adhering to MCP specifications, enabling compatibility with multiple MCP hosts such as Cursor, Claude Desktop, Windsurf, and Agentforce for Developers (A4D). This broad compatibility approach ensures that developers can access Salesforce Mobile Platform grounding context regardless of their preferred development environment.

---

# Project Goals

* **Centralize MCP Server Development:**  
  Provide a single, well-structured repository for developing, maintaining, and publishing MCP servers and tools related to Salesforce Mobile Platform development using the Model Context Protocol.

* **Extensibility:**  
  Architect the project as an "uber-project" (umbrella project) to support a growing ecosystem of MCP servers and tools, each targeting different aspects of the mobile development experience, as distinct, independently managed and published Node.js packages.

* **Open Source Best Practices:**  
  Foster community collaboration, transparency, and code quality through open source standards, clear documentation, and a welcoming contribution process.

---

# MCP Host Compatibility Strategy

Our approach to MCP host support is guided by distinct engineering and product objectives:

## Engineering Goals: Broad MCP Host Compatibility

From an engineering standpoint, our primary goal is to support as many MCP hosts as possible by:

* **Strict MCP Specification Compliance:** Carefully adhering to the official Model Context Protocol specifications and draft standards
* **Comprehensive Testing:** Validating functionality across multiple MCP hosts in the ecosystem to ensure broad compatibility
* **Standards-Based Design:** Implementing servers using standardized patterns (npx invocation, stdio transport, consistent tool annotations) that work across the MCP ecosystem
* **Community Integration:** Ensuring compatibility with community-developed MCP hosts and tools

## Product Goals: Salesforce Platform Integration

From a product standpoint, our primary focus is on delivering exceptional experiences within Salesforce development workflows:

* **Agentforce for Developers (A4D):** Designed to leverage A4D's MCP Host and Client infrastructure to deliver mobile platform grounding context directly within VSCode workflows
* **Salesforce Developer Experience:** Optimizing tool design, documentation, and workflows for Salesforce developers and their established development patterns
* **Enterprise Integration:** Ensuring seamless integration with Salesforce's development ecosystem and tooling

This dual approach ensures that while we maintain broad technical compatibility across the MCP ecosystem, we deliver optimized experiences for Salesforce developers and their workflows.

---

# Monorepo Architecture

To support current and future needs, the project is organized as a **monorepo** using [Nx](https://nx.dev/):

## Uber-Project (Monorepo)

The root of the repository manages shared configuration, documentation, and developer tooling.

## Sub-Projects (Packages)

Each MCP server is implemented as a standalone Node.js project, written in TypeScript, and located in its own directory under `packages/`.

* Each sub-project has its own `package.json`, dependencies, and release cycle.
* Sub-projects can be published independently to NPM.

### Initial Sub-Projects

The initial sub-projects planned for the monorepo include:

1. **`@salesforce/mobile-native-mcp-server`** - MCP server providing tools for Salesforce Mobile Native development scenarios
2. **Additional mobile platform MCP servers** - Future expansion covering other aspects of the Salesforce Mobile Platform ecosystem

### Directory Structure

```
mobile-mcp-tools/
  packages/
    mobile-native-mcp-server/ # Published as @salesforce/mobile-native-mcp-server
    mobile-platform/          # Future: Cross-platform mobile development tools
    mobile-data/              # Future: Mobile data management and sync tools
    ...
  nx.json
  package.json
  tsconfig.base.json
  README.md
```

---

# Design Principles

## Extensibility & Scalability

The monorepo structure allows for seamless addition of new MCP servers and tools as the needs of the Salesforce Mobile Platform and broader Model Context Protocol community evolve. Each MCP server can host multiple tool suites organized by functional domain.

## Separation of Concerns

By isolating each MCP server in its own package, we ensure clean dependency management, independent versioning, and clear ownership. Within each server, tools are further organized by functional domain.

## Modular Architecture

* **Server Level:** Each MCP server focuses on a specific development paradigm (e.g., mobile web, native mobile, cross-platform)
* **Tool Suite Level:** Within each server, tools are grouped into suites by functional area (e.g., native capabilities, offline patterns, platform APIs)
* **Tool Level:** Individual tools provide specific grounding context for particular capabilities or development patterns

## Information-Only Approach

All MCP tools follow an "information-only" pattern, supplying grounding context to requesting MCP clients without requiring user-specific or authenticated context. This ensures security and simplicity while maximizing utility.

## Community Engagement

Open source best practices—including clear documentation, contribution guidelines, and modular code—make it easy for both Salesforce teams and external contributors to participate and innovate.

---

# Shared Infrastructure

## Common Patterns

All MCP servers in the monorepo follow consistent patterns:

* **npx Invocation:** Servers are designed for easy invocation via `npx -y <package-name>`
* **STDIO Transport:** Communication uses the `stdio` transport mechanism per MCP standards
* **TypeScript:** All servers are written in TypeScript with strict type checking
* **Declaration Management:** Automated processes for updating API declaration files
* **Quality Assurance:** Consistent testing, linting, and evaluation frameworks

## Shared Configuration

The monorepo provides shared configuration for:

* TypeScript compilation settings
* Code quality tools (Prettier, ESLint)
* Testing frameworks (Vitest)
* Build and deployment pipelines
* Documentation standards

---

# Future Vision

The project is intentionally architected to support the full breadth of the Salesforce Mobile Platform ecosystem while maintaining broad MCP ecosystem compatibility:

* **Additional MCP Servers:** New servers for different mobile development paradigms (native mobile, cross-platform, specialized tooling)
* **Platform Coverage:** Comprehensive support for all Salesforce Mobile Platform development scenarios
* **Technology Diversity:** Flexibility to support various mobile development technologies and frameworks
* **MCP Ecosystem Evolution:** Continuous adaptation to support new MCP hosts, protocol updates, and community innovations
* **Community Contributions:** Open architecture supports external contributions across the mobile development spectrum and broader MCP ecosystem
* **API Evolution:** Flexible declaration management adapts to new API sources and mobile platform capabilities
* **Integration Scenarios:** Support for complex multi-tool workflows spanning different mobile development approaches across various MCP environments

---

# Open Source Collaboration

* **Community Development:** This project operates as an [open source repository](https://github.com/forcedotcom/mobile-mcp-tools), following Salesforce OSS guidelines and fostering community collaboration and contributions.

* **Security Considerations:** We adhere to established security best practices for MCP servers and AI-assisted development tools, ensuring our implementations follow appropriate security guidelines for the Model Context Protocol ecosystem.

* **MCP Ecosystem Integration:** We maintain continuous testing against multiple MCP hosts throughout the ecosystem to ensure broad compatibility and community adoption.

---

# References

* [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
* [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
* [Salesforce Lightning Web Components Developer Guide](https://developer.salesforce.com/docs/platform/lwc/guide)
* [Agentforce for Developers Documentation](https://developer.salesforce.com/docs/platform/einstein-for-devs/guide/einstein-overview.html)
