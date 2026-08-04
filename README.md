# mcp-bank-of-canada

Bank of Canada Valet API MCP. Keyless. Dates are YYYY-MM-DD.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `get_observations` | Time-series observations for one or more Bank of Canada series. Pass comma-separated series names. Well-known: FXUSDCAD (USD/CAD daily avg rate), FXEURCAD (EUR/CAD), V39079 (target for the overnight rate / policy rate), V41690973 (Total CPI). Choose either recent=N latest points OR a start_date/end_date window. |
| `get_group_observations` | Observations for every series in a named group in one call. Useful groups: FX_RATES_DAILY (daily exchange rates for all currencies vs CAD). Use recent=N or a start_date/end_date window. |
| `series_info` | Metadata for a single series: label and description. e.g. "FXUSDCAD" or "V39079". |
| `list_series` | Discover available series. Optionally filter by a case-insensitive substring matched against series label/description, e.g. "exchange rate" or "CPI". Omit query to list all (large). |
| `list_groups` | Discover available series groups. Optionally filter by a case-insensitive substring matched against group label/description, e.g. "exchange" or "lending". |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "bank-of-canada": {
      "url": "https://gateway.pipeworx.io/bank-of-canada/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Bank Of Canada data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
