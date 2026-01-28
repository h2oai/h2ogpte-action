# Configuration

The h2oGPTe GitHub Action supports several configuration options to customize the agent behavior.

## h2oGPTe Configuration Options

| Option                                          | Default      | Allowed Values                                                                                                               | Description                                                                                                                                                                                                                                                                                |
| ----------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Language Model (`llm`)**                      | `"auto"`     | Check your h2oGPTe instance at [approved models](https://docs.h2o.ai/enterprise-h2ogpte/guide/models-section) for full list. | Specify which language model to use. `"auto"` automatically selects the best available model.                                                                                                                                                                                              |
| **Agent Max Turns (`agent_max_turns`)**         | `"auto"`     | `"auto"`, `5`, `10`, `15`, `20`                                                                                              | Control the maximum number of reasoning steps. `"auto"` automatically selects optimal turns. Higher values allow for more complex reasoning but may take longer. Lower values provide faster responses but potentially less thorough analysis.                                             |
| **Agent Accuracy (`agent_accuracy`)**           | `"standard"` | `"quick"`, `"basic"`, `"standard"`, `"maximum"`                                                                              | Configure the accuracy level. `"quick"` for fastest responses, `"basic"` for good balance, `"standard"` recommended for code reviews, `"maximum"` for highest accuracy but slower.                                                                                                         |
| **Agent Total Timeout (`agent_total_timeout`)** | `3600`       | Any positive integer (in seconds)                                                                                            | Set the maximum time (in seconds) the agent can run before timing out. Default is 3600 seconds (1 hour). Invalid or negative values will use the default.                                                                                                                                  |
| **Guardrails Settings (`guardrails_settings`)** | —            | YAML string                                                                                                                  | Advanced content safety and compliance configuration using YAML. Enables regex filtering, PII detection actions, moderation labels, and custom category definitions.                                                                                                                       |
| **Custom Collection (`collection_id`)**         | -            | String                                                                                                                       | A new duplicate collection will be created containing the same file contents and configured settings as the provided collection (`collection_id`). New files attached to the user prompt will be added to this new collection. By default, a new empty collection is created at every run. |

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

## ✅ 3. Configuration Example

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
    collection_id: kbl-fincrime-aml
```

## Compatibility

Currently, only **h2ogpte version >= 1.6.31, <= 1.6.47** is supported. By default, the action uses
`https://h2ogpte.genai.h2o.ai` as the API base. If you wish to use a different h2ogpte environment, you need to:

1. Add your h2oGPTe server's base URL as a repository secret named `H2OGPTE_API_BASE`
2. The action will automatically use this secret if it exists, otherwise it defaults to `https://h2ogpte.genai.h2o.ai`

See `action.yml` for additional configuration details.
