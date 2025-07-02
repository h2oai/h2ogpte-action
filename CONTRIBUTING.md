# Contributing to h2oGPTe GitHub Action

## Development Guide

### Prerequisites

- GitHub repository with Actions enabled
- Access to h2oGPTe API (if required)

### Installation

1. Install [Bun](https://bun.sh/docs/installation) (JavaScript runtime and package manager).
2. Clone this repository.
3. Run `bun install` to install dependencies.
4. Install the pre-commit configuration `pre-commit install` (ensure you've installed [pre-commit](https://pre-commit.com/) first).
5. Run `bun run test` to run unit tests. See `package.json` for more bun scripts.

## Contribution Guide

We welcome contributions! To contribute, please follow these steps:

1. **Fork the repository**

   - Click the "Fork" button at the top right of the repository page to create your own copy.

2. **Create a feature branch with a descriptive name**

   - Use clear, descriptive names for your branches, such as:
     - `feature/add-image-support`
     - `fix/typo-in-readme`
     - `chore/update-dependencies`

3. **Make your changes and commit with clear messages**

4. **Submit a pull request (PR) from your feature branch to the upstream `main` branch**

5. **Request a review from a maintainer**
   - Tag a maintainer in your PR or use GitHub's review request feature.

## Integration Tests

| Test ID | Test Description                                                                 | Test Category   | Prerequisites                                              | Test Steps                                                                                                            | Expected Results                                                | Business Value                                                                             |
| ------- | -------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| IT-001  | Verify GitHub Action triggers on pull request review comment                     | Trigger         | Repository with GitHub Actions enabled, h2oGPTe API key    | 1. Configure workflow to trigger on pull_request_review_comment<br>2. Add a review comment with @h2ogpte mention      | Workflow should be triggered automatically                      | Enables developers to request AI assistance with a simple @mention, reducing manual effort |
| IT-012  | Verify GitHub Action creates initial reply comment on PR                         | GitHub API      | Repository with GitHub Actions enabled, GitHub API access  | 1. Configure workflow<br>2. Trigger workflow with valid inputs                                                        | Initial reply comment should be created on PR                   | Provides immediate feedback to developers that their request is being processed            |
| IT-013  | Verify GitHub Action sends instruction prompt to h2oGPTe                         | Integration     | Repository with GitHub Actions enabled, h2oGPTe API access | 1. Configure workflow<br>2. Trigger workflow with valid inputs                                                        | Instruction prompt should be sent to h2oGPTe                    | Ensures code context is properly sent to h2oGPTe for analysis                              |
| IT-015  | Verify GitHub Action updates PR comment with h2oGPTe response                    | GitHub API      | Repository with GitHub Actions enabled, GitHub API access  | 1. Configure workflow<br>2. Trigger workflow with valid inputs                                                        | PR comment should be updated with h2oGPTe response              | Delivers AI insights directly in the PR, eliminating the need to switch contexts           |
| IT-031  | Verify GitHub Action includes diff hunk in prompt when available                 | Integration     | Repository with GitHub Actions enabled, h2oGPTe API access | 1. Configure workflow<br>2. Trigger workflow with comment containing diff hunk                                        | Diff hunk should be included in instruction prompt              | Ensures h2oGPTe has the specific code changes to analyze, improving relevance of feedback  |
| IT-033  | Verify GitHub Action includes repository information in prompt                   | Integration     | Repository with GitHub Actions enabled, h2oGPTe API access | 1. Configure workflow<br>2. Trigger workflow                                                                          | Repository information should be included in instruction prompt | Provides repository context to h2oGPTe for more relevant analysis                          |
| IT-036  | Verify GitHub Action includes file path in prompt                                | Integration     | Repository with GitHub Actions enabled, h2oGPTe API access | 1. Configure workflow<br>2. Trigger workflow                                                                          | File path should be included in instruction prompt              | Ensures h2oGPTe understands which files are being modified, improving context awareness    |
| IT-037  | Verify GitHub Action includes user's comment in prompt                           | Integration     | Repository with GitHub Actions enabled, h2oGPTe API access | 1. Configure workflow<br>2. Trigger workflow                                                                          | User's comment should be included in instruction prompt         | Allows developers to ask specific questions about the code, enhancing understanding        |
| IT-039  | Verify GitHub Action uses different header for successful and failed completions | User Experience | Repository with GitHub Actions enabled                     | 1. Configure workflow<br>2. Trigger workflow with successful completion<br>3. Trigger workflow with failed completion | Different headers should be used for success and failure cases  | Improves clarity of AI responses, helping developers quickly understand the status         |
| IT-040  | Verify GitHub Action includes link to chat session in comments                   | User Experience | Repository with GitHub Actions enabled                     | 1. Configure workflow<br>2. Trigger workflow                                                                          | Link to chat session should be included in comments             | Provides access to full conversation history for deeper understanding of complex issues    |
