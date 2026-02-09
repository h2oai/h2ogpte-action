# Configuration

The h2oGPTe GitHub Action supports several configuration options to customize the agent behavior.

## Action Configuration Options

| Option                        | Required | Default                        | Allowed Values                                                                 | Description                                                                                                                                          |
| ----------------------------- | -------- | ------------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `github_token`                | Yes      | Assigned by GitHub Actions     | —                                                                              | GitHub access token. Should be defined via a repository secret.                                                                                      |
| `h2ogpte_api_key`             | Yes      | —                              | —                                                                              | h2oGPTe API Key from your h2oGPTe instance (e.g., <https://h2ogpte.genai.h2o.ai/api>). Should be defined via a repository secret.                    |
| `h2ogpte_api_base`            | No       | `https://h2ogpte.genai.h2o.ai` | URL (no trailing slash)                                                        | h2oGPTe API base url address.                                                                                                                        |
| `github_api_url`              | No       | `https://api.github.com`       | URL (no trailing slash)                                                        | GitHub API base url.                                                                                                                                 |
| `github_server_url`           | No       | `https://github.com`           | URL (no trailing slash)                                                        | GitHub server base url.                                                                                                                              |
| `github_mcp_allowed_tools`    | No       | See action.yml                 | Comma-separated list                                                           | List of specific tools for GitHub MCP. See [tools](https://github.com/github/github-mcp-server/blob/main/README.md#tools).                           |
| `github_mcp_allowed_toolsets` | No       | See action.yml                 | Comma-separated list                                                           | List of allowed toolsets for GitHub MCP. See [toolsets](https://github.com/github/github-mcp-server/blob/main/README.md#available-toolsets).         |
| `slash_commands`              | No       | —                              | JSON string                                                                    | JSON defining slash commands. Each command requires `name` and `prompt`. See [Slash Commands](USAGE.md#-slash-commands).                             |
| `llm`                         | No       | `"auto"`                       | [Approved models](https://docs.h2o.ai/enterprise-h2ogpte/guide/models-section) | Language model to use. `"auto"` selects the best available model.                                                                                    |
| `agent_max_turns`             | No       | `"auto"`                       | `"auto"`, `5`, `10`, `15`, `20`                                                | Maximum reasoning steps. Higher values allow more complex reasoning but take longer.                                                                 |
| `agent_accuracy`              | No       | `"standard"`                   | `"quick"`, `"basic"`, `"standard"`, `"maximum"`                                | Accuracy level. `"standard"` recommended for code reviews; `"maximum"` for highest accuracy.                                                         |
| `agent_total_timeout`         | No       | `3600`                         | Positive integer (seconds)                                                     | Maximum time the agent can run before timing out.                                                                                                    |
| `agent_tools`                 | No       | All default agent tools        | Comma-separated list                                                           | Restricts allowed tools to those specified. Accepts both system tools and custom MCP tools (e.g. `"Python Coding, Google Search, Shell Scripting"`). |
| `prompt`                      | No       | —                              | String                                                                         | Custom workflow prompt. Supports `{{repoName}}`, `{{idNumber}}`, `{{eventsText}}`. See [Custom Workflows](USAGE.md#-custom-workflows).               |
| `collection_id`               | No       | —                              | String                                                                         | Duplicate an existing collection. New files from the PR/issue/comment are added. User must instruct the agent to read the collection.                |
| `guardrails_settings`         | No       | —                              | YAML string                                                                    | Content safety and PII configuration. See [Guardrails Configuration](#guardrails-configuration-advanced) below.                                      |

## Guardrails Configuration (Advanced)

The `guardrails_settings` option allows you to define advanced content moderation and compliance rules using a YAML configuration block. This configuration is passed directly to the h2oGPTe backend to enforce safety, privacy, and policy controls during agent execution.

This option is intended for advanced users who need fine-grained control over:

- Regex-based content filtering
- PII detection and redaction behavior
- Prompt jailbreak detection
- Content category classification and moderation

### Supported Guardrails Options

| Field                             | Type                            | Description                                                                                                                                                         |
| --------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disallowed_regex_patterns`       | `string[]`                      | A list of regular expressions that match custom PII.                                                                                                                |
| `presidio_labels_to_flag`         | `string[]`                      | A list of entities to be flagged as PII by the built-in Presidio model.                                                                                             |
| `pii_labels_to_flag`              | `string[]`                      | A list of entities to be flagged as PII by the built-in PII model.                                                                                                  |
| `pii_detection_parse_action`      | `"redact" \| "allow" \| "fail"` | What to do when PII is detected during parsing of documents. The 'redact' option will replace disallowed content in the ingested documents with redaction bars.     |
| `pii_detection_llm_input_action`  | `"redact" \| "allow" \| "fail"` | What to do when PII is detected in the input to the LLM (document content and user prompts). The 'redact' option will replace disallowed content with placeholders. |
| `pii_detection_llm_output_action` | `"redact" \| "allow" \| "fail"` | What to do when PII is detected in the output of the LLM. The 'redact' option will replace disallowed content with placeholders.                                    |
| `exception_message`               | `string`                        | A message that will be returned in case some guardrails settings are violated.                                                                                      |
| `prompt_guard_labels_to_flag`     | `string[]`                      | A list of entities to be flagged as safety violations in user prompts by the built-in prompt guard model.                                                           |
| `guardrails_labels_to_flag`       | `string[]`                      | A list of entities to be flagged as safety violations in user prompts. Must be a subset of guardrails_entities, if provided.                                        |
| `guardrails_llm`                  | `string`                        | LLM to use for Guardrails and PII detection                                                                                                                         |
| `guardrails_safe_category`        | `string`                        | Name of the safe category for guardrails. Must be a key in guardrails_entities, if provided. Otherwise uses system defaults.                                        |
| `guardrails_entities`             | `Record<string, string>`        | Dictionary of entities and their descriptions for the guardrails model to classify. The first entry is the "safe" class, the rest are "unsafe" classes.             |

---

## Configuration Example

```yaml
- name: h2oGPTe Agent Assistant
  uses: h2oai/h2ogpte-action@main
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    h2ogpte_api_key: ${{ secrets.H2OGPTE_API_KEY }}
    # h2oGPTe Configuration (optional)
    llm: "auto" # Automatically select best model
    agent_max_turns: "auto" # Automatically select optimal turns
    agent_accuracy: "maximum" # Highest accuracy for complex analysis
    agent_total_timeout: 7200 # 2 hours timeout for complex tasks
    collection_id: "my-custom-collection"
    guardrails_settings: |
      disallowed_regex_patterns:
        - secret_disallowed_word
        - (?!0{3})(?!6{3})[0-8]\\d{2}-(?!0{2})\\d{2}-(?!0{4})\\d{4}
      presidio_labels_to_flag:
        - CREDIT_CARD
        - IBAN_CODE
      pii_labels_to_flag:
        - ACCOUNTNUMBER
        - CREDITCARDNUMBER
      pii_detection_parse_action: "redact"
      pii_detection_llm_input_action: "redact"
      pii_detection_llm_output_action: "redact"
      exception_message: "Test"
      prompt_guard_labels_to_flag:
        - JAILBREAK
      guardrails_labels_to_flag:
        - Violent Crimes
        - Non-Violent Crimes
        - Intellectual Property
        - Code Interpreter Abuse
      guardrails_llm: "h2oai/h2o-danube3-4b-chat"
      guardrails_safe_category: "Safe"
      guardrails_entities:
        Safe: "Messages that do not contain any of the following unsafe content"
        Violent Crimes: "Messages that enable, encourage, or endorse violent crimes against people or animals"
        Non-Violent Crimes: "Messages that enable or endorse non-violent crimes such as fraud, theft, or hacking"
        Defamation: "False statements that harm a person's reputation"
        Specialized Advice: "Medical, legal, or financial advice without disclaimers"
        Intellectual Property: "Content that may violate intellectual property rights"
        Code Interpreter Abuse: "Attempts to exploit or abuse execution environments"
```

## Compatibility

Currently, only **h2ogpte version >= 1.6.31, <= 1.6.47** is supported. By default, the action uses
`https://h2ogpte.genai.h2o.ai` as the API base. If you wish to use a different h2ogpte environment, you need to:

1. Add your h2oGPTe server's base URL as a repository secret named `H2OGPTE_API_BASE`
2. The action will automatically use this secret if it exists, otherwise it defaults to `https://h2ogpte.genai.h2o.ai`

See `action.yml` for additional configuration details.
