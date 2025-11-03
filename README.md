# h2oGPTe Action

![h2oGPTe responding to a comment](docs/images/h2ogpte_hero.png)

The h2oGPTe GitHub Action brings intelligent AI assistance directly into your GitHub workflow. Simply tag `@h2ogpte` in any comment, issue, or pull request, and the agent will provide instant AI-powered code review feedback, understand your codebase context, and even write code and make commits when requested.

## 🚀 Quick Start

Install the action in your repository using our installation script:

```bash
curl -fsSL https://raw.githubusercontent.com/h2oai/h2ogpte-action/refs/heads/main/installation.sh | sh -s < /dev/tty
```

Running the installation script will lock the action to the latest [tag version](https://github.com/h2oai/h2ogpte-action/tags).

## 💬 Basic Usage

Once installed, simply mention `@h2ogpte` in any comment, issue, or pull request:

```text
@h2ogpte Can you review the changes in this PR and suggest improvements?
```

The agent will automatically analyze your code and provide intelligent feedback.

## ⚙️ Inputs

| Input             | Description                                                                           | Required | Default Value                            |
| ----------------- | ------------------------------------------------------------------------------------- | -------- | ---------------------------------------- |
| github_token      | Github access token.                                                                  | Yes      | Assigned automatically by GitHub Actions |
| h2ogpte_api_key   | h2oGPTe API Key from your h2oGPTe instance (e.g., <https://h2ogpte.genai.h2o.ai/api>) | Yes      | –                                        |
| h2ogpte_api_base  | h2oGPTe API base url address (no trailing slash)                                      | No       | <https://h2ogpte.genai.h2o.ai>           |
| github_api_url    | GitHub API base url (no trailing slash)                                               | No       | <https://api.github.com>                 |
| github_server_url | GitHub server base url (no trailing slash)                                            | No       | <https://github.com>                     |

## 📚 Examples

The repository includes several example workflows:

- **[Basic Usage](examples/h2ogpte.yaml)** - Standard workflow for manual `@h2ogpte` mentions
- **[Auto PR Review](examples/custom_workflows/h2ogpte_auto_pr.yaml)** - Automatic code review on pull requests
- **[Auto Documentation](examples/custom_workflows/h2ogpte_auto_docs.yaml)** - Automatic documentation generation

See [examples](examples/) for more workflow configurations.

## 📖 Documentation

- **[Configuration](docs/CONFIGURATION.md)** - Detailed configuration options and settings
- **[Usage Guide](docs/USAGE.md)** - Comprehensive usage examples and custom prompting
- **[FAQ](docs/FAQ.md)** - Common questions and troubleshooting
- **[Contributing](CONTRIBUTING.md)** - Development setup and contribution guidelines

## ✅ Requirements

h2oGPTe Action v0.2.0-beta is tested on:

$ 1.6.31 <= \text{h2oGPTe version} <= 1.6.42$

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For questions, bug reports, or feature requests, please open an issue on GitHub.
