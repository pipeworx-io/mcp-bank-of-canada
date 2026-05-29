interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Bank of Canada Valet API MCP. Keyless. Dates are YYYY-MM-DD.
 */


const BASE = 'https://www.bankofcanada.ca/valet';
const UA = 'pipeworx-mcp-bank-of-canada/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'get_observations',
    description:
      'Time-series observations for one or more Bank of Canada series. Pass comma-separated series names. Well-known: FXUSDCAD (USD/CAD daily avg rate), FXEURCAD (EUR/CAD), V39079 (target for the overnight rate / policy rate), V41690973 (Total CPI). Choose either recent=N latest points OR a start_date/end_date window.',
    inputSchema: {
      type: 'object',
      properties: {
        series: { type: 'string', description: 'Comma-separated series names, e.g. "FXUSDCAD" or "FXUSDCAD,FXEURCAD".' },
        recent: { type: 'integer', description: 'Return the N most recent observations. Ignored if start_date is given.' },
        start_date: { type: 'string', description: 'Window start, YYYY-MM-DD, e.g. "2026-01-01".' },
        end_date: { type: 'string', description: 'Window end, YYYY-MM-DD (optional, defaults to latest).' },
      },
      required: ['series'],
    },
  },
  {
    name: 'get_group_observations',
    description:
      'Observations for every series in a named group in one call. Useful groups: FX_RATES_DAILY (daily exchange rates for all currencies vs CAD). Use recent=N or a start_date/end_date window.',
    inputSchema: {
      type: 'object',
      properties: {
        group: { type: 'string', description: 'Group name, e.g. "FX_RATES_DAILY".' },
        recent: { type: 'integer', description: 'Return the N most recent observations. Ignored if start_date is given.' },
        start_date: { type: 'string', description: 'Window start, YYYY-MM-DD.' },
        end_date: { type: 'string', description: 'Window end, YYYY-MM-DD (optional).' },
      },
      required: ['group'],
    },
  },
  {
    name: 'series_info',
    description: 'Metadata for a single series: label and description. e.g. "FXUSDCAD" or "V39079".',
    inputSchema: {
      type: 'object',
      properties: { series: { type: 'string', description: 'Series name, e.g. "FXUSDCAD".' } },
      required: ['series'],
    },
  },
  {
    name: 'list_series',
    description:
      'Discover available series. Optionally filter by a case-insensitive substring matched against series label/description, e.g. "exchange rate" or "CPI". Omit query to list all (large).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Substring to match against label/description (case-insensitive).' },
        limit: { type: 'integer', description: 'Max results to return (default 50).' },
      },
    },
  },
  {
    name: 'list_groups',
    description:
      'Discover available series groups. Optionally filter by a case-insensitive substring matched against group label/description, e.g. "exchange" or "lending".',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Substring to match against label/description (case-insensitive).' },
        limit: { type: 'integer', description: 'Max results to return (default 50).' },
      },
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'get_observations': {
      const series = reqStr(args, 'series', '"FXUSDCAD" or "FXUSDCAD,FXEURCAD"');
      return bocGet(`/observations/${encodeURIComponent(series)}/json${rangeQuery(args)}`);
    }
    case 'get_group_observations': {
      const group = reqStr(args, 'group', '"FX_RATES_DAILY"');
      return bocGet(`/observations/group/${encodeURIComponent(group)}/json${rangeQuery(args)}`);
    }
    case 'series_info': {
      const series = reqStr(args, 'series', '"FXUSDCAD"');
      return bocGet(`/series/${encodeURIComponent(series)}/json`);
    }
    case 'list_series': {
      const data = (await bocGet('/lists/series/json')) as { series?: Record<string, { label?: string; description?: string }> };
      return filterCatalog(data.series ?? {}, args);
    }
    case 'list_groups': {
      const data = (await bocGet('/lists/groups/json')) as { groups?: Record<string, { label?: string; description?: string }> };
      return filterCatalog(data.groups ?? {}, args);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function bocGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Bank of Canada: ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
  return res.json();
}

function rangeQuery(args: Record<string, unknown>): string {
  const start = args.start_date as string | undefined;
  const params = new URLSearchParams();
  if (typeof start === 'string' && start.trim()) {
    params.set('start_date', start);
    const end = args.end_date as string | undefined;
    if (typeof end === 'string' && end.trim()) params.set('end_date', end);
  } else {
    const recent = args.recent;
    params.set('recent', recent == null ? '10' : String(recent));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function filterCatalog(
  entries: Record<string, { label?: string; description?: string }>,
  args: Record<string, unknown>,
): { count: number; total: number; results: Array<{ name: string; label?: string; description?: string }> } {
  const query = (args.query as string | undefined)?.toLowerCase().trim();
  const limit = typeof args.limit === 'number' && args.limit > 0 ? args.limit : 50;
  const all = Object.entries(entries).map(([name, v]) => ({ name, label: v.label, description: v.description }));
  const matched = query
    ? all.filter((e) => `${e.name} ${e.label ?? ''} ${e.description ?? ''}`.toLowerCase().includes(query))
    : all;
  return { count: Math.min(matched.length, limit), total: matched.length, results: matched.slice(0, limit) };
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
