# Configuration

The h2oGPTe GitHub Action supports several configuration options to customize the agent behavior.

## h2oGPTe Configuration Options

| Option                                          | Default      | Allowed Values                                                                                                               | Description                                                                                                                                                                                                                                    |
| ----------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Language Model (`llm`)**                      | `"auto"`     | Check your h2oGPTe instance at [approved models](https://docs.h2o.ai/enterprise-h2ogpte/guide/models-section) for full list. | Specify which language model to use. `"auto"` automatically selects the best available model.                                                                                                                                                  |
| **Agent Max Turns (`agent_max_turns`)**         | `"auto"`     | `"auto"`, `5`, `10`, `15`, `20`                                                                                              | Control the maximum number of reasoning steps. `"auto"` automatically selects optimal turns. Higher values allow for more complex reasoning but may take longer. Lower values provide faster responses but potentially less thorough analysis. |
| **Agent Accuracy (`agent_accuracy`)**           | `"standard"` | `"quick"`, `"basic"`, `"standard"`, `"maximum"`                                                                              | Configure the accuracy level. `"quick"` for fastest responses, `"basic"` for good balance, `"standard"` recommended for code reviews, `"maximum"` for highest accuracy but slower.                                                             |
| **Agent Total Timeout (`agent_total_timeout`)** | `3600`       | Any positive integer (in seconds)                                                                                            | Set the maximum time (in seconds) the agent can run before timing out. Default is 3600 seconds (1 hour). Invalid or negative values will use the default.                                                                                      |

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
```

## Compatibility

Currently, only **h2ogpte version >= 1.6.31, <= 1.6.47** is supported. By default, the action uses
`https://h2ogpte.genai.h2o.ai` as the API base. If you wish to use a different h2ogpte environment, you need to:

1. Add your h2oGPTe server's base URL as a repository secret named `H2OGPTE_API_BASE`
2. The action will automatically use this secret if it exists, otherwise it defaults to `https://h2ogpte.genai.h2o.ai`

See `action.yml` for additional configuration details.
