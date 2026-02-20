# Frequently Asked Questions (FAQ)

## 🔄 Why don't my subsequent action trigger when h2oGPTe pushes commits?

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

## 🚫 Why can't h2oGPTe create PRs?

### Problem

h2oGPTe is unable to create pull requests, even when configured to do so. You may see error messages indicating insufficient permissions or authentication failures when the action attempts to create PRs.

### Root Cause

By default, GitHub Actions workflows have limited permissions and cannot create or approve pull requests unless explicitly enabled in the repository settings.

### Solution

Enable pull request creation permissions for GitHub Actions:

1. **Navigate to repository settings:**

   - Go to your repository on GitHub
   - Click on **Settings** tab

2. **Access Actions settings:**

   - In the left sidebar, click on **Actions** → **General**

3. **Enable PR permissions:**
   - Scroll down to the "Workflow permissions" section
   - Check the box: **"Allow GitHub Actions to create and approve pull requests"**
   - Click **Save**

![GitHub Actions PR Permissions](images/action_PR_permissions.png)

### Additional Notes

- This setting applies to all workflows in the repository
- The `GITHUB_TOKEN` will automatically have the necessary permissions once this setting is enabled
- You may need to re-run your h2oGPTe workflow after making this change

## Does the action support GitHub Enterprise Server (GHES) with MCP?

Yes, if you run your own GitHub MCP server and point the action at it.

The built-in remote GitHub MCP does not support GHES, and h2oGPTe does not support Docker MCP commands, so the recommended approach is to host a **standalone** [GitHub MCP server](https://github.com/github/github-mcp-server) (e.g. build from source), expose it at a URL reachable by your cluster (e.g. internal URL or tunnel), then set the action's **`github_mcp_url`** input to the full URL of your MCP server. See [Configuring MCP for GHES](CONFIGURATION.md#configuring-mcp-for-github-enterprise-server-ghes) for a high-level guide.

_If you have additional questions or need help with your specific setup, please open an issue in this repository._
