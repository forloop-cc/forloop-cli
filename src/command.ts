export interface OptionDef {
  flag: string;
  description: string;
  type?: 'string' | 'number' | 'boolean' | 'array';
  required?: boolean;
}

export interface CliConfig {
  region: 'global' | 'dev';
  apiUrl: string;
  serverLambdaUrl: string;
  environment: string;
  output: 'text' | 'json';
  timeout: number;
  verbose: boolean;
  quiet: boolean;
  noColor: boolean;
  dryRun: boolean;
  nonInteractive: boolean;
  apiKey?: string;
}

export interface CommandSpec {
  name: string;
  description: string;
  usage?: string;
  options?: OptionDef[];
  examples?: string[];
  run(config: CliConfig, flags: Record<string, unknown>): Promise<void>;
}

export interface Command extends CommandSpec {
  execute(config: CliConfig, flags: Record<string, unknown>): Promise<void>;
}

export function defineCommand(spec: CommandSpec): Command {
  return {
    ...spec,
    execute: spec.run,
  };
}

export const GLOBAL_OPTIONS: OptionDef[] = [
  { flag: '--api-key <key>',       description: 'ForLoop API key' },
  { flag: '--api-url <url>',       description: 'API base URL (overrides config)' },
  { flag: '--base-url <url>',      description: 'Alias for --api-url' },
  { flag: '--output <format>',     description: 'Output format: text (default), json' },
  { flag: '--timeout <seconds>',   description: 'Request timeout (default: 60)', type: 'number' },
  { flag: '--quiet',               description: 'Suppress non-essential output' },
  { flag: '--verbose',             description: 'Print HTTP request/response details' },
  { flag: '--no-color',            description: 'Disable ANSI colors' },
  { flag: '--dry-run',             description: 'Show what would happen without executing' },
  { flag: '--non-interactive',     description: 'Disable interactive prompts (CI mode)' },
  { flag: '--help',                description: 'Show help' },
  { flag: '--version',             description: 'Print version' },
];
