# h2oGPTe GitHub Action

This GitHub Action integrates h2oGPTe, an AI assistant by H2O.ai, into your GitHub workflow. It allows you to leverage AI capabilities directly within your pull requests and code reviews.

## Features

- AI-powered code reviews and suggestions
- Automated responses to PR comments when mentioned with @h2ogpte
- Integration with h2oGPTe's advanced language capabilities
- Ability to create commits directly on PR branches

## Prerequisites

- A GitHub repository where you want to use the action
- [Bun](https://bun.sh/) installed for local development and testing
- h2oGPTe API key from [h2oGPTe Cloud](https://h2ogpte.cloud-dev.h2o.dev/)

## Installation

Add this action to your GitHub workflow by creating a `.github/workflows/h2ogpte.yml` file:

```yaml
name: h2oGPTe PR Assistant

on:
  pull_request_review_comment:
    types: [created]

jobs:
  h2ogpte-respond:
    if: contains(github.event.comment.body, '@h2ogpte')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: h2oGPTe Action
        uses: MillenniumForce/h2ogpte-action@main
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          h2ogpte_api_key: ${{ secrets.H2OGPTE_API_KEY }}
```

## Usage

1. Set up the GitHub workflow as described above
2. Add your h2oGPTe API key as a repository secret named `H2OGPTE_API_KEY`
3. In a pull request, add a review comment that includes `@h2ogpte` followed by your request

Example: `@h2ogpte can you suggest ways to improve this file?`

## Development

1. Install Bun: Follow the instructions at [bun.sh](https://bun.sh/)
2. Install dependencies: `bun install`
3. Test the action locally: `bun run test-action`

## License

This project is licensed under the terms specified in the LICENSE file.
