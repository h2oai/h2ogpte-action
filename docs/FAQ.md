# Frequently Asked Questions (FAQ)

## 🔄 Why doesn't my quality-checks action trigger when h2oGPTe pushes commits?

### Problem

When h2oGPTe pushes commits to an active pull request, subsequent GitHub Actions workflows (like quality-checks, linting, or testing) do not trigger automatically. This can cause PRs to be blocked from merging because the required status checks haven't run.

### Root Cause

This is a known limitation of GitHub Actions. When an action pushes commits using the default `GITHUB_TOKEN`, GitHub intentionally prevents triggering new workflows to avoid infinite loops. This behavior is documented in the [GitHub Community discussion](https://github.com/orgs/community/discussions/25702).

### Solution Options

#### Option 1: Use a Personal Access Token (PAT) ✅ **Recommended**

Create a Personal Access Token (PAT) with appropriate permissions and configure your workflow to use it:

1. **Create a PAT:**

   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate a new token with `repo` permissions
   - Copy the token

2. **Add the PAT as a repository secret:**

   - Go to your repository Settings → Secrets and variables → Actions
   - Add a new secret named `PAT` with your token value

3. **Update your h2oGPTe workflow:**

   ```yaml
   - name: h2oGPTe Agent Assistant
     uses: h2oai/h2ogpte-action@main
     with:
       github_token: ${{ secrets.PAT }} # Use PAT instead of GITHUB_TOKEN
       h2ogpte_api_key: ${{ secrets.H2OGPTE_API_KEY }}
       # ... other configuration
   ```

#### Option 2: Manual Re-trigger

If you prefer not to use additional tokens, you can manually re-trigger your quality checks by:

- Pushing an empty commit: `git commit --allow-empty -m "trigger checks"`
- Re-running the workflow manually from the Actions tab

_If you have additional questions or need help with your specific setup, please open an issue in this repository._
