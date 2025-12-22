# Contributing to h2oGPTe GitHub Action

🚀 We welcome all contributors!

## Quick Start

Get up and running in minutes:

1. **Install Bun**: Follow the [Bun installation guide](https://bun.sh/docs/installation)
2. **Fork the repository**: Click "Fork" on [GitHub](https://github.com/h2oai/h2ogpte-action)
3. **Clone your fork**: `git clone https://github.com/YOUR_USERNAME/h2ogpte-action.git`
4. **Add upstream remote**: `git remote add upstream https://github.com/h2oai/h2ogpte-action`
5. **Install dependencies**: `bun install`
6. **Run tests**: `bun run test`

## Prerequisites

- **Bun** (required) - JavaScript runtime and package manager
- **h2oGPTe API key** - Get it from [https://h2ogpte.genai.h2o.ai/api](https://h2ogpte.genai.h2o.ai/api)

## Development Workflow

### Building the Action

The action runs directly from the source code using Bun.

- **Type checking**: `bun run type-check` - Validates TypeScript without emitting files
- **Linting**: `bun run lint` - Check code style, `bun run lint:fix` - Auto-fix issues
- **Formatting**: `bun run format` - Auto-format code with Prettier

### Testing

**Unit Tests:**

```bash
bun run test                    # All tests
bun test tests/fetcher.test.ts  # Specific test file
```

**Local Workflow Testing:**

Test the GitHub Action workflow locally using test event payloads in `.github/test-events/`:

**GitHub Local Actions (Extension):**

1. Open GitHub Local Actions sidebar
2. Configure secrets: `GITHUB_TOKEN`, `H2OGPTE_API_KEY`, `H2OGPTE_API_BASE`
3. Set actor to your GitHub username (Settings > Options > actor)
4. Select event: `issues`, `issue_comment`, or `pull_request`

**act CLI:**

```bash
export GITHUB_ACTOR=YOUR_USERNAME
export GITHUB_TOKEN=your_token
export H2OGPTE_API_KEY=your_key
export H2OGPTE_API_BASE=your_base_url

act issues -W .github/workflows/h2ogpte.yml -e .github/test-events/issue.json
```

**Note:** If you see "nektos/act is not a user", set `GITHUB_ACTOR` or use `-a YOUR_USERNAME` flag.

## Pre-commit Hooks (Optional but Recommended)

Pre-commit hooks automatically run code quality checks before each commit:

- **Auto-lint** - Fixes code style issues
- **Auto-format** - Formats code with Prettier
- **Type checking** - Validates TypeScript
- **Unit tests** - Runs the test suite

### Setup

```bash
# Install pre-commit hooks
pre-commit install
```

### Manual Alternative

If you prefer not to use pre-commit hooks, run these commands manually before committing:

```bash
bun run lint:fix    # Fix linting issues
bun run format      # Format code
bun run test        # Run tests
```

## Making Contributions

### 1. Fork and Branch

- Fork the repository on GitHub
- Create a feature branch: `git checkout -b feature/your-feature-name`
- Use descriptive branch names: `feature/llm-routing`, `fix/typo-in-readme`

### 2. Make Changes

- Test locally: `bun run test` and test workflow with act
- Follow existing code style and patterns
- Add tests for new functionality

### 3. Commit and Push

- Make clear, descriptive commit messages
- Push your branch: `git push origin feature/your-feature-name`

### 4. Submit Pull Request

- Create a PR from your feature branch to **main**
- Maintainers will help review and merge correctly into the appropriate branch

### Adding Tests

Create test files with `.test.ts` extension in `tests/` (mirrors `src/` structure). Follow existing patterns.
