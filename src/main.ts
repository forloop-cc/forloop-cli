import { scanCommandPath, parseFlags } from './args';
import { registry } from './registry';
import { GLOBAL_OPTIONS } from './command';
import { handleError } from './errors/handler';
import { getConfig } from '@forloop/opencode-plugin';
import { getToken } from '@forloop/opencode-plugin';
import { detectTokenType } from '@forloop/opencode-plugin';

const CLI_VERSION = '0.2.0';

process.on('SIGINT', () => {
  process.stderr.write('\nInterrupted. Exiting.\n');
  process.exit(130);
});

process.stdout.on('error', (e: NodeJS.ErrnoException) => {
  if (e.code === 'EPIPE') process.exit(0);
});

const NO_AUTH_COMMANDS = [
  ['auth', 'login'],
  ['auth', 'logout'],
  ['auth', 'status'],
];

async function main() {
  const argv = process.argv.slice(2);

  if (argv.includes('--version') || argv.includes('-v')) {
    console.log(`forloop ${CLI_VERSION}`);
    process.exit(0);
  }

  const commandPath = scanCommandPath(argv, GLOBAL_OPTIONS);

  if (argv.includes('--help') || argv.includes('-h')) {
    registry.printHelp(commandPath, process.stderr);
    process.exit(0);
  }

  // Zero args: show help + auth status (if logged in)
  if (commandPath.length === 0) {
    registry.printHelp([], process.stderr);

    try {
      const token = await getToken();
      if (token) {
        const tokenType = detectTokenType(token);
        const masked = token.slice(0, 8) + '...' + token.slice(-4);
        process.stderr.write(`\n  Token: ${masked}  Type: ${tokenType || 'unknown'}\n`);
        process.stderr.write('  Use forloop --help for all available commands.\n\n');
      } else {
        process.stderr.write('\n  Not authenticated.\n');
        process.stderr.write('  forloop auth login --api-key floop_xxxxx\n\n');
      }
    } catch {
      process.stderr.write('\n  Not authenticated.\n');
      process.stderr.write('  forloop auth login --api-key floop_xxxxx\n\n');
    }
    process.exit(0);
  }

  const { command, extra } = registry.resolve(commandPath);
  const flags = parseFlags(argv, [...GLOBAL_OPTIONS, ...(command.options ?? [])]);

  if (extra.length > 0) flags._positional = extra;

  const pluginConfig = getConfig();
  const token = await getToken();

  const isNoAuth = NO_AUTH_COMMANDS.some(
    (cmd) => cmd.every((c, i) => commandPath[i] === c),
  );

  if (!isNoAuth && !token) {
    process.stderr.write('\nError: No ForLoop API token configured.\n');
    process.stderr.write('  Run: forloop auth login --api-key floop_xxxxx\n');
    process.stderr.write('  Or set: FORLOOP_API_KEY environment variable\n\n');
    process.exit(3);
  }

  const cliConfig = {
    region: (pluginConfig.apiUrl.includes('dev.forloop.cc') ? 'dev' : 'global') as 'global' | 'dev',
    apiUrl: pluginConfig.apiUrl,
    serverLambdaUrl: '',
    environment: pluginConfig.environment,
    output: (flags.output === 'json' ? 'json' : 'text') as 'text' | 'json',
    timeout: (flags.timeout as number) ?? 60,
    verbose: flags.verbose === true,
    quiet: flags.quiet === true,
    noColor: flags.noColor === true || !process.stdout.isTTY,
    dryRun: flags.dryRun === true,
    nonInteractive: flags.nonInteractive === true,
    apiKey: (flags.apiKey || token) as string | undefined,
  };

  await command.execute(cliConfig, flags);
}

main().catch(handleError);
