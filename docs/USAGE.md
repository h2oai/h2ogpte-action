# Usage

The h2oGPTe GitHub Action integrates AI assistance directly into your GitHub workflow. Simply tag `@h2ogpte` in any comment, issue, or pull request, and the agent will provide intelligent feedback and assistance.

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

Provides automated code review feedback on pull requests. The agent examines code changes and creates detailed review comments with suggestions for improvements, without modifying the code directly.

### 📋 Automatic Issue Context ([h2ogpte_auto_issue_context.yaml](../examples/custom_workflows/h2ogpte_auto_issue_context.yaml))

Automatically provides contextual analysis when new issues are opened. The agent analyzes the issue description, identifies relevant parts of the codebase, and creates helpful comments that provide additional context about which files are relevant, potential implementation approaches, and considerations for addressing the issue.

See [examples](../examples/custom_workflows) of more custom workflow configurations.

## 🎯 Custom Prompting

The action also supports custom prompting for specialized workflows.

When using custom prompts, you can inject the following variables into your prompt text:

| Variable         | Description                                                                                                             | Example Usage                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `{{repoName}}`   | The name of the repository                                                                                              | `You must only work in the user's repository, {{repoName}}` |
| `{{idNumber}}`   | The pull request or issue number                                                                                        | `on pull request number {{idNumber}}`                       |
| `{{eventsText}}` | Chronological list of previous events, including pull request/issue comments and commit history separated by new lines. | `Here are the previous events: {{eventsText}}`              |

These variables are automatically populated by the action and help provide context-aware responses.
