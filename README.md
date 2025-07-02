# h2oGPTe GitHub Action

> A GitHub Action that integrates h2oGPTe AI assistant into your workflow for automated code reviews and suggestions.

## Overview

The h2oGPTe GitHub Action reduces manual effort by:

1. Automating code review responses through AI
2. Eliminating the need to switch contexts by providing feedback directly in pull requests
3. Allowing developers to get instant feedback by simply mentioning @h2ogpte in comments
4. Providing detailed analysis of code changes with repository context awareness

The solution helps developers better understand issues by:

1. Analysing code in the context of the specific repository
2. Providing AI-powered insights about code changes
3. Maintaining conversation history for complex issues
4. Including relevant file paths and code context in the analysis

## Installation Guide

> **Note:** This GitHub Action will only work for repositories linked to the h2o.ai enterprise organization (i.e., h2oai-owned or enterprise-connected repositories).

To install the h2oGPTe Agent Assistant GitHub Action in your repository:

1. **Add the Workflow File**

   - Copy the file at `examples/h2ogpte.yaml` from this repository into your own repository at `.github/workflows/h2ogpte.yaml`.

2. **Add the h2oGPTe API Key as a Repository Secret**
   - In your repository on GitHub, go to **Settings** > **Secrets and variables** > **Actions**.
   - Click **New repository secret**.
   - Set the name to `H2OGPTE_API_KEY`.
   - Paste your h2oGPTe API key as the value.
   - Click **Add secret**.

Once these steps are complete, the workflow will be triggered automatically on issues, pull requests, and comments that mention `@h2ogpte`. See below for more details on use cases.

### Compatibility

Currently, only h2ogpte version >= 1.6.31 is supported. By default, the action uses `https://h2ogpte.internal.dedicated.h2o.ai` as the API base. If you wish to use a different h2ogpte environment, set the `h2ogpte_api_base` input in your workflow file (see `action.yml` for details).

### Supported Action Inputs

| Input             | Description                                                      | Required | Default Value                               |
| ----------------- | ---------------------------------------------------------------- | -------- | ------------------------------------------- |
| github_token      | Github access token.                                             | Yes      | Assigned automatically by GitHub Actions    |
| h2ogpte_api_key   | h2oGPTe API Key from <https://h2ogpte.internal.dedicated.h2o.ai> | Yes      | –                                           |
| h2ogpte_api_base  | h2oGPTe API base url address (no trailing slash)                 | No       | <https://h2ogpte.internal.dedicated.h2o.ai> |
| github_api_url    | GitHub API base url (no trailing slash)                          | No       | <https://api.github.com>                    |
| github_server_url | GitHub server base url (no trailing slash)                       | No       | <https://github.com>                        |

### Use Cases

Here are a few ways you can use the h2oGPTe Agent Assistant action in your repository:

- **Pull Request Comment:**

  > Leave a comment in a pull request mentioning `@h2ogpte` to trigger the action and receive AI-powered feedback.
  >
  > Example:
  >
  > ```
  > @h2ogpte Can you review the changes in this PR and suggest improvements?
  > ```

- **Issue Comment:**

  > Mention `@h2ogpte` in an issue comment to get help or suggestions related to the issue.
  >
  > Example:
  >
  > ```
  > @h2ogpte What are the possible causes for this bug?
  > ```

- **New Issue or PR Body:**

  > You can also mention `@h2ogpte` directly in the body of a new issue or pull request to automatically trigger the workflow.
  >
  > Example:
  >
  > ```
  > This PR refactors the authentication logic. @h2ogpte please check for security issues.
  > ```

- **Adding Images:**
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

## Developer Guide

### Prerequisites

- GitHub repository with Actions enabled
- Access to h2oGPTe API (if required)

### Installation

1. Install [Bun](https://bun.sh/docs/installation) (JavaScript runtime and package manager).
2. Clone this repository.
3. Run `bun install` to install dependencies.
4. Install the pre-commit configuration `pre-commit install` (ensure you've installed [pre-commit](https://pre-commit.com/) first).
5. Run `bun run test` to run unit tests. See `package.json` for more bun scripts.

### Integration Tests

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
