# h2oGPTe GitHub Action

A GitHub Action that integrates h2oGPTe AI assistant into your workflow for automated code reviews and suggestions.

## Overview

The h2oGPTe GitHub Action reduces manual effort by:

1. Automating code review responses through AI
2. Eliminating the need to switch contexts by providing feedback directly in pull requests
3. Allowing developers to get instant feedback by simply mentioning @h2ogpte in comments
4. Providing detailed analysis of code changes with repository context awareness

The solution helps developers better understand issues by:

1. Analyzing code in the context of the specific repository
2. Providing AI-powered insights about code changes
3. Maintaining conversation history for complex issues
4. Including relevant file paths and code context in the analysis

## Out-of-the-Box Implementation

These tests verify that the h2oGPTe GitHub Action can be implemented in any GitHub repository with minimal configuration. The only requirements are:

1. GitHub Actions enabled in the repository (currently only [cloud-dev](https://h2ogpte.cloud-dev.h2o.dev/) supported)
2. h2oGPTe API key and base URL configured as secrets
3. GitHub token with appropriate permissions

Once configured, developers can immediately start using the AI-powered code review capabilities by simply mentioning @h2ogpte in their pull request review comments.

## Developer Guide

### Prerequisites

- GitHub repository with Actions enabled
- Access to h2oGPTe API (if required)

### Installation

1. Install [Bun](https://bun.sh/docs/installation) (JavaScript runtime and package manager)
2. Clone this repository
3. Run `bun install` to install dependencies

### Usage

Currently we can only run the action from our own GH repository: `.github/workflows/h2ogpte.yml`

### Local Testing

To test the action locally:

```bash
bun run test-action
```

## Integration Tests

| Test ID | Test Description | Test Category | Prerequisites | Test Steps | Expected Results | Business Value |
|---------|-----------------|--------------|---------------|------------|------------------|----------------|
| IT-001 | Verify GitHub Action triggers on pull request review comment | Trigger | Repository with GitHub Actions enabled, h2oGPTe API key | 1. Configure workflow to trigger on pull_request_review_comment<br>2. Add a review comment with @h2ogpte mention | Workflow should be triggered automatically | Enables developers to request AI assistance with a simple @mention, reducing manual effort |
| IT-012 | Verify GitHub Action creates initial reply comment on PR | GitHub API | Repository with GitHub Actions enabled, GitHub API access | 1. Configure workflow<br>2. Trigger workflow with valid inputs | Initial reply comment should be created on PR | Provides immediate feedback to developers that their request is being processed |
| IT-013 | Verify GitHub Action sends instruction prompt to h2oGPTe | Integration | Repository with GitHub Actions enabled, h2oGPTe API access | 1. Configure workflow<br>2. Trigger workflow with valid inputs | Instruction prompt should be sent to h2oGPTe | Ensures code context is properly sent to h2oGPTe for analysis |
| IT-015 | Verify GitHub Action updates PR comment with h2oGPTe response | GitHub API | Repository with GitHub Actions enabled, GitHub API access | 1. Configure workflow<br>2. Trigger workflow with valid inputs | PR comment should be updated with h2oGPTe response | Delivers AI insights directly in the PR, eliminating the need to switch contexts |
| IT-031 | Verify GitHub Action includes diff hunk in prompt when available | Integration | Repository with GitHub Actions enabled, h2oGPTe API access | 1. Configure workflow<br>2. Trigger workflow with comment containing diff hunk | Diff hunk should be included in instruction prompt | Ensures h2oGPTe has the specific code changes to analyze, improving relevance of feedback |
| IT-033 | Verify GitHub Action includes repository information in prompt | Integration | Repository with GitHub Actions enabled, h2oGPTe API access | 1. Configure workflow<br>2. Trigger workflow | Repository information should be included in instruction prompt | Provides repository context to h2oGPTe for more relevant analysis |
| IT-036 | Verify GitHub Action includes file path in prompt | Integration | Repository with GitHub Actions enabled, h2oGPTe API access | 1. Configure workflow<br>2. Trigger workflow | File path should be included in instruction prompt | Ensures h2oGPTe understands which files are being modified, improving context awareness |
| IT-037 | Verify GitHub Action includes user's comment in prompt | Integration | Repository with GitHub Actions enabled, h2oGPTe API access | 1. Configure workflow<br>2. Trigger workflow | User's comment should be included in instruction prompt | Allows developers to ask specific questions about the code, enhancing understanding |
| IT-039 | Verify GitHub Action uses different header for successful and failed completions | User Experience | Repository with GitHub Actions enabled | 1. Configure workflow<br>2. Trigger workflow with successful completion<br>3. Trigger workflow with failed completion | Different headers should be used for success and failure cases | Improves clarity of AI responses, helping developers quickly understand the status |
| IT-040 | Verify GitHub Action includes link to chat session in comments | User Experience | Repository with GitHub Actions enabled | 1. Configure workflow<br>2. Trigger workflow | Link to chat session should be included in comments | Provides access to full conversation history for deeper understanding of complex issues |
