# h2oGPTe GitHub Action

A GitHub Action that integrates h2oGPTe AI assistant into your workflow for automated code reviews and suggestions.

## Overview

This action allows you to leverage h2oGPTe's capabilities directly within your GitHub repository. It can automatically review pull requests, suggest code improvements, and assist with development tasks.

## Features

- Automated code reviews on pull requests
- AI-powered code suggestions and improvements
- Integration with GitHub's comment system
- Customizable configuration options

## Getting Started Guide

### Prerequisites

- GitHub repository with Actions enabled
- Access to h2oGPTe API (if required)

### Installation

1. Install [Bun](https://bun.sh/docs/installation) (JavaScript runtime and package manager)
2. Clone this repository
3. Run `bun install` to install dependencies

### Usage

Add the following to your GitHub workflow file (e.g., `.github/workflows/h2ogpte.yml`):

```yaml
name: h2oGPTe Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  code-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: h2oGPTe Review
        uses: MillenniumForce/h2ogpte-action@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Local Testing

To test the action locally:

```bash
bun run test-action
```

## Configuration Options

| Option | Description | Required | Default |
|--------|-------------|----------|--------|
| `github-token` | GitHub token for API access | Yes | N/A |
| `h2ogpte-api-key` | API key for h2oGPTe service | No | N/A |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
