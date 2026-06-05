import { formatError } from '../output/formatter';
import { CLIError } from './base';
import { ExitCode } from './codes';

export function handleError(error: unknown): void {
  const isJson = process.argv.includes('--output=json');
  const message = error instanceof Error ? error.message : String(error);
  const exitCode =
    error instanceof CLIError ? error.exitCode : ExitCode.GENERAL;

  if (isJson) {
    console.error(formatError(message, 'json'));
  } else {
    process.stderr.write(`\nError: ${message}\n`);
  }

  const suggestion =
    error instanceof CLIError ? error.suggestion : undefined;
  if (suggestion && !isJson) {
    process.stderr.write(`\nTip: ${suggestion}\n`);
  }

  process.exit(exitCode);
}
