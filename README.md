# 🤖 h2oGPTe GitHub Action

> A GitHub Action that integrates h2oGPTe Agents into your workflow for automated code reviews and suggestions.

## 📑 Table of Contents

- [📋 Overview](#-overview)
- [🚀 Installation Guide](#-installation-guide)
  - [🔧 Compatibility](#-compatibility)
  - [📝 Supported Action Inputs](#-supported-action-inputs)
  - [⚙️ h2oGPTe Configuration Options](#️-h2ogpte-configuration-options)
- [💡 Use Cases](#-use-cases)
- [👨‍💻 Developer Guide](#-developer-guide)

## 📋 Overview

The h2oGPTe GitHub Action brings intelligent AI assistance directly into your GitHub workflow. Simply tag `@h2ogpte` in any comment, issue, or pull request, and the agent will:

⚡ **Provide instant AI-powered code review feedback** with context-aware analysis and suggestions

🧠 **Understand your codebase** by analyzing changes in the context of your specific repository

🔧 **Write code, make commits, and open pull requests** automatically when you request changes

⏰ **Save you time** by eliminating the need to switch between tools - everything happens right in GitHub

The agent maintains conversation history for complex issues and provides detailed insights with relevant file paths and code context, making it easier to understand and improve your code.

## 🚀 Installation Guide

> **Note:** This GitHub Action will only work for repositories linked to the h2o.ai enterprise organization (i.e., h2oai-owned or enterprise-connected repositories).

To install the h2oGPTe Agent Assistant GitHub Action in your repository:

1. **Clone your repository**: Open your IDE or terminal and clone the H2O organization repository you'd like to add the action to
2. **Create the workflows directory**: Run `mkdir -p .github/workflows` in your repository
3. **Get the workflow file**: Copy the contents from [https://github.com/h2oai/h2ogpte-action/blob/main/examples/h2ogpte.yaml](https://github.com/h2oai/h2ogpte-action/blob/main/examples/h2ogpte.yaml)
4. **Add the workflow**: Create a new file called `h2ogpte.yaml` inside the `.github/workflows` directory and paste the copied contents
5. **Save your changes**: Commit and push your changes to the main branch
6. **Get your API key**: Create your h2oGPTe API key at [https://h2ogpte.internal.dedicated.h2o.ai/api](https://h2ogpte.internal.dedicated.h2o.ai/api) and save it securely
7. **Navigate to your repository**: Open [github.com](http://github.com) and go to your repository page
8. **Add the secret**: Go to Settings → Secrets and variables → Actions
9. **Create new secret**: Click "New repository secret"
10. **Configure the secret**: Set name to "H2OGPTE_API_KEY" and paste your API key value
11. **Finish setup**: Click the "Add secret" button

Once these steps are complete, the workflow will be triggered automatically on issues, pull requests, and comments that mention `@h2ogpte`. See below for more details on use cases.

### 🔧 Compatibility

Currently, only h2ogpte version >= 1.6.31 is supported. By default, the action uses `https://h2ogpte.internal.dedicated.h2o.ai` as the API base. If you wish to use a different h2ogpte environment, set the `h2ogpte_api_base` input in your workflow file (see `action.yml` for details).

### 📝 Supported Action Inputs

| Input             | Description                                                      | Required | Default Value                               |
| ----------------- | ---------------------------------------------------------------- | -------- | ------------------------------------------- |
| github_token      | Github access token.                                             | Yes      | Assigned automatically by GitHub Actions    |
| h2ogpte_api_key   | h2oGPTe API Key from <https://h2ogpte.internal.dedicated.h2o.ai> | Yes      | –                                           |
| h2ogpte_api_base  | h2oGPTe API base url address (no trailing slash)                 | No       | <https://h2ogpte.internal.dedicated.h2o.ai> |
| github_api_url    | GitHub API base url (no trailing slash)                          | No       | <https://api.github.com>                    |
| github_server_url | GitHub server base url (no trailing slash)                       | No       | <https://github.com>                        |

### ⚙️ h2oGPTe Configuration Options

The action supports several configuration options to customize the h2oGPTe agent behaviour:

| Option                                          | Default      | Allowed Values                                                                                                               | Description                                                                                                                                                                                                                                    |
| ----------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Language Model (`llm`)**                      | `"auto"`     | Check your h2oGPTe instance at [approved models](https://docs.h2o.ai/enterprise-h2ogpte/guide/models-section) for full list. | Specify which language model to use. `"auto"` automatically selects the best available model.                                                                                                                                                  |
| **Agent Max Turns (`agent_max_turns`)**         | `"auto"`     | `"auto"`, `5`, `10`, `15`, `20`                                                                                              | Control the maximum number of reasoning steps. `"auto"` automatically selects optimal turns. Higher values allow for more complex reasoning but may take longer. Lower values provide faster responses but potentially less thorough analysis. |
| **Agent Accuracy (`agent_accuracy`)**           | `"standard"` | `"quick"`, `"basic"`, `"standard"`, `"maximum"`                                                                              | Configure the accuracy level. `"quick"` for fastest responses, `"basic"` for good balance, `"standard"` recommended for code reviews, `"maximum"` for highest accuracy but slower.                                                             |
| **Agent Total Timeout (`agent_total_timeout`)** | `3600`       | Any positive integer (in seconds)                                                                                            | Set the maximum time (in seconds) the agent can run before timing out. Default is 3600 seconds (1 hour). Invalid or negative values will use the default.                                                                                      |

#### 🔧 Configuration Example

```yaml
- name: h2oGPTe Agent Assistant
  uses: h2oai/h2ogpte-action@main
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    h2ogpte_api_key: ${{ secrets.H2OGPTE_API_KEY }}
    # h2oGPTe Configuration (optional)
    llm: "auto" # Automatically select best model
    agent_max_turns: "auto" # Automatically select optimal turns
    agent_accuracy: "maximum" # Highest accuracy for complex analysis
    agent_total_timeout: 7200 # 2 hours timeout for complex tasks
```

### 💡 Use Cases

#### 💬 Chat with the agent

Here are a few ways you can use the h2oGPTe Agent Assistant action in your repository:

- **🔍 Pull Request Comment:**

  > Leave a comment in a pull request mentioning `@h2ogpte` to trigger the action and receive AI-powered feedback.
  >
  > Example:
  >
  > ```
  > @h2ogpte Can you review the changes in this PR and suggest improvements?
  > ```

- **🐛 Issue Comment:**

  > Mention `@h2ogpte` in an issue comment to get help or suggestions related to the issue.
  >
  > Example:
  >
  > ```
  > @h2ogpte What are the possible causes for this bug?
  > ```

- **📝 New Issue or PR Body:**

  > You can also mention `@h2ogpte` directly in the body of a new issue or pull request to automatically trigger the workflow.
  >
  > Example:
  >
  > ```
  > This PR refactors the authentication logic. @h2ogpte please check for security issues.
  > ```

- **🖼️ Adding Images:**
  > You can attach images to your comments or issues for h2oGPTe to analyze. For example, you might upload a screenshot of an error or a diagram:
  >
  > Example:
  >
  > ```
  > @h2ogpte Can you help me understand this error?
  > [image attachment]
  > ```
  >
  > **Note:** You can also upload other file types, but due to [GitHub restrictions](https://github.com/orgs/community/discussions/162417#discussioncomment-13428503), only images can be processed by h2oGPTe. Other file types will be ignored.

#### ✨ Custom prompting

The action also supports custom prompting for specialized workflows.

When using custom prompts, you can inject the following variables into your prompt text:

| Variable         | Description                           | Example Usage                                               |
| ---------------- | ------------------------------------- | ----------------------------------------------------------- |
| `{{repoName}}`   | The name of the repository            | `You must only work in the user's repository, {{repoName}}` |
| `{{idNumber}}`   | The pull request or issue number      | `on pull request number {{idNumber}}`                       |
| `{{eventsText}}` | Chronological list of previous events | `Here are the previous events: {{eventsText}}`              |

These variables are automatically populated by the action and help provide context-aware responses.

Below are two full example workflows you can use:

- **🔍 Automatic Pull Request Review (`h2ogpte_auto_pr.yaml`)**

  > Provides automated code review feedback on pull requests. The agent examines code changes and creates detailed review comments with suggestions for improvements, without modifying the code directly.

- **📚 Automatic Documentation Generation (`h2ogpte_auto_docs.yaml`)**
  > Automatically generates documentation for code changes in pull requests. The agent analyzes the code modifications and creates comprehensive documentation including docstrings, comments, and README updates.

See [examples](examples/) for complete workflow configurations.

## 👨‍💻 Developer Guide

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.
