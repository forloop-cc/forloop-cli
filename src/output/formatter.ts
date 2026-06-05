export type OutputFormat = 'text' | 'json';

export function detectOutputFormat(configFormat: string | undefined): OutputFormat {
  return configFormat === 'json' ? 'json' : 'text';
}

export function formatOutput(data: unknown, format: OutputFormat): string {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }
  return typeof data === 'string' ? data : String(data);
}

export function formatError(message: string, format: OutputFormat): string {
  if (format === 'json') {
    return JSON.stringify({ error: { message } }, null, 2);
  }
  return `❌ ${message}`;
}

export function formatSuccess(message: string, format: OutputFormat): string {
  if (format === 'json') {
    return JSON.stringify({ ok: true, message }, null, 2);
  }
  return `✅ ${message}`;
}
