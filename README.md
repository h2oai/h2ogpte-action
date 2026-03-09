# h2oGPTe Action

![h2oGPTe responding to a comment](https://raw.githubusercontent.com/h2oai/h2ogpte-action/refs/heads/main/docs/images/h2ogpte_hero_light.png)

The h2oGPTe GitHub Action brings intelligent AI assistance directly into your GitHub workflow. Simply tag `@h2ogpte` in any comment, issue, or pull request, and the agent will provide instant AI-powered code review feedback, understand your codebase context, and even write code and make commits when requested.

🎥 Watch our **[YouTube Video](https://youtu.be/nx8qoFsxCk8)** to get started.

## 🚀 Quick Start

Install the action in your repository using our installation script:

```bash
curl -fsSL https://raw.githubusercontent.com/h2oai/h2ogpte-action/refs/heads/main/installation.sh | sh -s < /dev/tty
```

Running the installation script will lock the action to the latest [tag version](https://github.com/h2oai/h2ogpte-action/tags).

Watch our [installation video](https://youtu.be/SYlSfo-zzZ8) for a step-by-step guide.

## 💬 Basic Usage

Once installed, simply mention `@h2ogpte` in any comment, issue, or pull request:

```text
@h2ogpte Can you review the changes in this PR and suggest improvements?
```

The agent will automatically analyze your code and provide intelligent feedback.

For all configuration options, see the **[Configuration](docs/CONFIGURATION.md#configuration-options)** guide.

## 📚 Examples

The repository includes several example workflows:

- **[Basic Usage](examples/h2ogpte.yaml)** - Standard workflow for manual `@h2ogpte` mentions with slash commands
- **[Auto PR Review](examples/custom_workflows/h2ogpte_auto_pr.yaml)** - Automatic code review on pull requests
- **[Auto Documentation](examples/custom_workflows/h2ogpte_auto_docs.yaml)** - Automatic documentation generation

See [examples](examples/) for more workflow configurations. Or, check out our [use case series on YouTube](https://www.youtube.com/watch?v=eZQei55KMBU&list=PLNtMya54qvOEgXpCqylmMwFagqqfOpK8b&index=3).

## 📖 Documentation

- **[Configuration](docs/CONFIGURATION.md)** - Detailed configuration options and settings
- **[Usage Guide](docs/USAGE.md)** - Comprehensive usage examples and custom prompting
- **[FAQ](docs/FAQ.md)** - Common questions and troubleshooting
- **[Contributing](CONTRIBUTING.md)** - Development setup and contribution guidelines

## ✅ Requirements

h2oGPTe Action v0.2.2-beta requires h2oGPTe versions 1.6.31 through 1.6.47.

This version range has been tested and verified for compatibility.

For GitHub Enterprise Server, see [Configuring MCP for GHES](docs/CONFIGURATION.md#configuring-mcp-for-github-enterprise-server-ghes).

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For questions, bug reports, or feature requests, please open an issue on GitHub.
