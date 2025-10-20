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

### Running Tests

- **All tests**: `bun run test` - Runs the complete test suite
- **Individual tests**: `bun test tests/fetcher.test.ts` - Run specific test files
- **Test location**: All tests are in the `tests/` directory

### Local Testing

Since this is a GitHub Action, you can test changes by:

1. Making your changes
2. Running the test suite to ensure nothing breaks
3. Creating a test branch and pushing to your fork
4. Setting up a test workflow in your fork's repository

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

- **Test your changes locally first** - Run `bun run test` to ensure nothing breaks
- Follow the existing code style and patterns
- Add tests for new functionality

### 3. Commit and Push

- Make clear, descriptive commit messages
- Push your branch: `git push origin feature/your-feature-name`

### 4. Submit Pull Request

- Create a PR from your feature branch to **main**
- Maintainers will help review and merge correctly into the appropriate branch

## Testing

### Unit Tests

- **Location**: All tests are in the `tests/` directory
- **Framework**: Uses Bun's built-in test runner
- **Structure**: Tests mirror the `src/` directory structure

### Adding New Tests

1. Create test files with `.test.ts` extension
2. Place them in the appropriate `tests/` subdirectory
3. Follow existing test patterns and naming conventions
4. Run `bun run test` to verify your tests work

### Test Categories

- **Core functionality** - Data fetching, response building
- **Service integrations** - GitHub API, h2oGPTe API
- **Utility functions** - File handling, formatting, etc.
