# Usage

The h2oGPTe GitHub Action integrates AI assistance directly into your GitHub workflow. Simply tag `@h2ogpte` in any comment, issue, or pull request, and the agent will provide intelligent feedback and assistance.

🎥 Watch our use case series on [YouTube](https://www.youtube.com/watch?v=eZQei55KMBU&list=PLNtMya54qvOEgXpCqylmMwFagqqfOpK8b&index=3).

## 💬 Basic Usage

### 🔍 Pull Request Comment

Leave a comment in a pull request mentioning `@h2ogpte` to trigger the action and receive AI-powered feedback.

Example:

```text
@h2ogpte Can you review the changes in this PR and suggest improvements?
```

### 🐛 Issue Comment

Mention `@h2ogpte` in an issue comment to get help or suggestions related to the issue.

Example:

```text
@h2ogpte What are the possible causes for this bug?
```

### 📝 New Issue or PR Body

You can also mention `@h2ogpte` directly in the body of a new issue or pull request to automatically trigger the workflow.

Example:

```text
This PR refactors the authentication logic. @h2ogpte please check for security issues.
```

### 🖼️ Adding Images

You can attach images to your comments or issues for h2oGPTe to analyze. For example, you might upload a screenshot of an error or a diagram:

Example:

```text
@h2ogpte Can you help me understand this error?
[image attachment]
```

**Note:** You can also upload other file types, but due to [GitHub restrictions](https://github.com/orgs/community/discussions/162417#discussioncomment-13428503), only images can be processed by h2oGPTe. Other file types will be ignored.

## 📚 Custom Workflows

### 🔍 Automatic Pull Request Review ([h2ogpte_auto_pr.yaml](../examples/custom_workflows/h2ogpte_auto_pr.yaml))

Provides automated code review for pull requests. The agent analyzes your changes to identify potential issues, suggest improvements, and highlight best practices. It creates detailed review comments with specific recommendations without modifying your code directly.

### 📋 Automatic Issue Context ([h2ogpte_auto_issue_context.yaml](../examples/custom_workflows/h2ogpte_auto_issue_context.yaml))

Provides instant developer onboarding for new issues. When someone opens an issue, the agent immediately scans the codebase and comments with a roadmap showing which files are involved, what changes might be needed, and implementation suggestions. Perfect for helping new contributors understand where to start working.

### 📚 Automatic Documentation Generation ([h2ogpte_auto_docs.yaml](../examples/custom_workflows/h2ogpte_auto_docs.yaml))

Maintains comprehensive documentation standards across your repository. This workflow automatically reviews pull requests and generates appropriate documentation including docstrings, inline comments, and README updates to ensure code changes are properly documented. It adheres to existing documentation conventions while preserving all existing functionality.

### 🧪 Automatic Test Generation ([h2ogpte_auto_test.yaml](../examples/custom_workflows/h2ogpte_auto_test.yaml))

Ensures your code changes never ship without proper test coverage. The agent reviews each pull request, identifies untested code paths, and automatically creates comprehensive test files that cover edge cases and follow your project's testing conventions. It only adds tests - never modifies existing code.

### 🦺 Automatic Guardrails & PII Protection ([h2ogpte_guardrails.yaml](../examples/custom_workflows/h2ogpte_guardrails.yaml))

Redacts configured personally identifiable information (PII) during the document ingestion, input and output from the user prompt (issues, pull requests, comments, reviews). Further, given a list of safe and unsafe labels, the agent will flag safety violations in the user prompt and respond with the configured exception message.

## 🔧 Slash Commands

Slash commands allow you to predefine specific behaviors for the agent. When a user includes a slash command in their instruction, the agent will use the corresponding prompt to guide its response.

### ⌨️ Using Slash Commands

Simply include the slash command in your comment along with your request:

```text
@h2ogpte /review this code and check for security issues
```

```text
@h2ogpte /explain how this authentication flow works
```

```text
@h2ogpte /plan a feature to add user authentication
```

You can use multiple slash commands in a single instruction:

```text
@h2ogpte /review and /explain this code
```

### 📦 Default Slash Commands

The action comes with three default slash commands:

- **`/explain`** - Provides clear and accurate code explanations
- **`/review`** - Performs comprehensive code reviews
- **`/plan`** - Creates implementation plans without writing code

### 🎨 Custom Slash Commands

You can define your own slash commands in your workflow configuration. Each command requires:

- **`name`**: The command identifier (must start with `/`)
- **`prompt`**: The system prompt that guides the agent's behavior when this command is used

#### 💡 Example workflow configuration

```yaml
slash_commands: |
  [
    {
      "name": "/refactor",
      "prompt": "You are an expert at refactoring code. Focus on improving code quality, readability, and maintainability while preserving functionality. Provide specific refactoring suggestions with examples."
    },
    {
      "name": "/debug",
      "prompt": "You are a debugging expert. Analyze the code for bugs, identify root causes, and suggest fixes. Be methodical and explain your reasoning step by step."
    },
    {
      "name": "/optimize",
      "prompt": "You are a performance optimization specialist. Analyze code for performance bottlenecks, suggest optimizations, and explain the trade-offs involved."
    }
  ]
```

See the [Basic Usage example](../examples/h2ogpte.yaml) for a complete workflow configuration with slash commands.

### 📌 Usage Behaviour

- Command matching is case-insensitive (e.g., `/review` matches `/Review` or `/REVIEW`)
- Commands must match exactly (e.g., `/test` won't match `/testing` or `/test-drive`)
- To escape a slash command (prevent it from being interpreted as a command), prefix it with another slash (e.g., `//plan` will not trigger the `/plan` command)
- If no matching commands are found in the instruction, the agent uses its default behavior
- Slash commands work alongside regular instructions - you can combine them naturally

## 🔧 Slash Commands

Slash commands allow you to predefine specific behaviors for the agent. When a user includes a slash command in their instruction, the agent will use the corresponding prompt to guide its response.

### ⌨️ Using Slash Commands

Simply include the slash command in your comment along with your request:

```text
@h2ogpte /review this code and check for security issues
```

```text
@h2ogpte /explain how this authentication flow works
```

```text
@h2ogpte /plan a feature to add user authentication
```

You can use multiple slash commands in a single instruction:

```text
@h2ogpte /review and /explain this code
```

### 📦 Default Slash Commands

The action comes with three default slash commands:

- **`/explain`** - Provides clear and accurate code explanations
- **`/review`** - Performs comprehensive code reviews
- **`/plan`** - Creates implementation plans without writing code

### 🎨 Custom Slash Commands

You can define your own slash commands in your workflow configuration. Each command requires:

- **`name`**: The command identifier (must start with `/`)
- **`prompt`**: The system prompt that guides the agent's behavior when this command is used

#### 💡 Example workflow configuration

```yaml
slash_commands: |
  [
    {
      "name": "/refactor",
      "prompt": "You are an expert at refactoring code. Focus on improving code quality, readability, and maintainability while preserving functionality. Provide specific refactoring suggestions with examples."
    },
    {
      "name": "/debug",
      "prompt": "You are a debugging expert. Analyze the code for bugs, identify root causes, and suggest fixes. Be methodical and explain your reasoning step by step."
    },
    {
      "name": "/optimize",
      "prompt": "You are a performance optimization specialist. Analyze code for performance bottlenecks, suggest optimizations, and explain the trade-offs involved."
    }
  ]
```

See the [Basic Usage example](../examples/h2ogpte.yaml) for a complete workflow configuration with slash commands.

### 📌 Usage Behaviour

- Command matching is case-insensitive (e.g., `/review` matches `/Review` or `/REVIEW`)
- Commands must match exactly (e.g., `/test` won't match `/testing` or `/test-drive`)
- To escape a slash command (prevent it from being interpreted as a command), prefix it with another slash (e.g., `//plan` will not trigger the `/plan` command)
- If no matching commands are found in the instruction, the agent uses its default behavior
- Slash commands work alongside regular instructions - you can combine them naturally

## 🎯 Custom Prompting

The action also supports custom prompting for specialized workflows.

When using custom prompts, you can inject the following variables into your prompt text:

| Variable         | Description                                                                                                             | Example Usage                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `{{repoName}}`   | The name of the repository                                                                                              | `You must only work in the user's repository, {{repoName}}` |
| `{{idNumber}}`   | The pull request or issue number                                                                                        | `on pull request number {{idNumber}}`                       |
| `{{eventsText}}` | Chronological list of previous events, including pull request/issue comments and commit history separated by new lines. | `Here are the previous events: {{eventsText}}`              |

These variables are automatically populated by the action and help provide context-aware responses.
