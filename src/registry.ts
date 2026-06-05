import type { Command } from './command';
import { CLIError } from './errors/base';
import { ExitCode } from './errors/codes';

import { createAuthCommands } from './commands/auth/index';
import { createStoryCommands } from './commands/story';
import { createSprintCommands } from './commands/sprint';
import { createOrgCommands } from './commands/org';
import { createTemplateCommands } from './commands/template';
import { createAgentCommands } from './commands/agent';
import { createUserCommands } from './commands/user';
import { createFileCommands } from './commands/file';
import { createFolderCommands } from './commands/folder';
import { createSyncCommands } from './commands/sync';

interface CommandNode {
  command?: Command;
  children: Map<string, CommandNode>;
}

class CommandRegistry {
  private root: CommandNode = { children: new Map() };

  constructor(commands: Record<string, Command>) {
    for (const [path, cmd] of Object.entries(commands)) {
      this.register(path, cmd);
    }
  }

  private register(path: string, command: Command): void {
    const parts = path.split(' ');
    let node = this.root;
    for (const part of parts) {
      if (!node.children.has(part)) {
        node.children.set(part, { children: new Map() });
      }
      node = node.children.get(part)!;
    }
    node.command = command;
  }

  getAllCommands(): Command[] {
    const commands: Command[] = [];
    const seen = new Set<Command>();
    const traverse = (node: CommandNode) => {
      if (node.command && !seen.has(node.command)) {
        seen.add(node.command);
        commands.push(node.command);
      }
      for (const child of node.children.values()) {
        traverse(child);
      }
    };
    traverse(this.root);
    return commands;
  }

  resolve(commandPath: string[]): { command: Command; extra: string[] } {
    let node = this.root;
    const matched: string[] = [];

    for (const part of commandPath) {
      const child = node.children.get(part);
      if (!child) break;
      node = child;
      matched.push(part);
    }

    if (node.command) {
      return { command: node.command, extra: commandPath.slice(matched.length) };
    }

    // Single child: auto-forward (e.g. `forloop agent` -> `forloop agent help`)
    if (matched.length > 0 && node.children.size === 1) {
      const [, child] = node.children.entries().next().value as [string, CommandNode];
      if (child.command) {
        return { command: child.command, extra: commandPath.slice(matched.length) };
      }
    }

    // Alias-only group: all children point to the same command
    // e.g. `sprint show` and `sprint get` both point to the same command instance
    if (matched.length > 0 && node.children.size > 1) {
      const children = Array.from(node.children.values());
      const commands = children.map((c) => c.command);
      const first = commands[0];
      if (first && commands.every((c) => c === first)) {
        return { command: first, extra: commandPath.slice(matched.length) };
      }
    }

    if (matched.length > 0 && node.children.size > 0) {
      const subcommands = Array.from(node.children.entries())
        .map(([name, n]) => {
          if (n.command) return `  ${matched.join(' ')} ${name}    ${n.command.description}`;
          const subs = Array.from(n.children.keys()).join(', ');
          return `  ${matched.join(' ')} ${name} [${subs}]`;
        })
        .join('\n');
      throw new CLIError(
        `Unknown command: forloop ${commandPath.join(' ')}\n\nAvailable commands:\n${subcommands}`,
        ExitCode.USAGE,
        `forloop ${matched.join(' ')} --help`,
      );
    }

    throw new CLIError(
      `Unknown command: forloop ${commandPath.join(' ')}`,
      ExitCode.USAGE,
      'forloop --help',
    );
  }

  // Color helpers
  private bold  = (s: string, out: NodeJS.WriteStream) => out.isTTY ? `\x1b[1m${s}\x1b[0m` : s;
  private accent = (s: string, out: NodeJS.WriteStream) => out.isTTY ? `\x1b[38;2;59;130;246m${s}\x1b[0m` : s;
  private dim   = (s: string, out: NodeJS.WriteStream) => out.isTTY ? `\x1b[2m${s}\x1b[0m` : s;

  printHelp(commandPath: string[], out: NodeJS.WriteStream = process.stdout): void {
    if (commandPath.length === 0) {
      this.printRootHelp(out);
      return;
    }

    let node = this.root;
    for (const part of commandPath) {
      const child = node.children.get(part);
      if (!child) {
        this.printRootHelp(out);
        return;
      }
      node = child;
    }

    if (node.command) {
      this.printCommandHelp(node.command, out);
      return;
    }

    const prefix = commandPath.join(' ');
    out.write(`\n${this.bold('Usage:', out)} forloop ${prefix} <command> [flags]\n\n`);
    out.write(`${this.bold('Commands:', out)}\n`);
    this.printChildren(node, prefix, out);
    out.write('\n');
  }

  private printRootHelp(out: NodeJS.WriteStream): void {
    const LOGO = [
      ' ███████╗ █████╗ ██████╗ ██╗      █████╗  █████╗ ██████╗ ',
      ' ██╔════╝██╔══██╗██╔══██╗██║     ██╔══██╗██╔══██╗██╔══██╗',
      ' █████╗  ██║  ██║██████╔╝██║     ██║  ██║██║  ██║██████╔╝',
      ' ██╔══╝  ██║  ██║██╔══██╗██║     ██║  ██║██║  ██║██╔═══╝ ',
      ' ██║     ╚████╔╝ ██║  ██║███████╗╚████╔╝╚█████╔╝║██║     ',
      ' ╚═╝      ╚═══╝  ╚═╝  ╚═╝╚══════╝ ╚═══╝  ╚═══╝  ╚══╝     ',
    ];
    const BLUE = [59, 130, 246];

    out.write('\n');
    for (const line of LOGO) {
      if (out.isTTY) {
        out.write(`\x1b[1;38;2;${BLUE[0]};${BLUE[1]};${BLUE[2]}m${line}\x1b[0m\n`);
      } else {
        out.write(line + '\n');
      }
    }

    const b = (s: string) => this.bold(s, out);
    const a = (s: string) => this.accent(s, out);
    const d = (s: string) => this.dim(s, out);

    out.write(`
${b('Usage:')} forloop <resource> <command> [flags]

${b('Resources:')}
  ${a('auth')}       ${d('Authentication (login, status, logout)')}
  ${a('sprint')}     ${d('Sprint operations (list, get, create, update, delete)')}
  ${a('story')}      ${d('Story operations (create, get, update, delete)')}
  ${a('template')}   ${d('Template operations (list)')}
  ${a('agent')}      ${d('Agent operations (history, developer-sprint, developer-status)')}
  ${a('org')}        ${d('Organization operations (list, get, create, update)')}
  ${a('user')}       ${d('User operations (profile, quotas)')}
  ${a('file')}       ${d('File operations (upload, list, delete, download)')}
  ${a('folder')}     ${d('Folder operations (create)')}
  ${a('sync')}       ${d('Sync operations (aivy-folder, aivy-doc-get, s3-to-local, local-to-s3)')}

${b('Global Flags:')}
  ${a('--api-key <key>')}        ${d('ForLoop API key')}
  ${a('--api-url <url>')}        ${d('API base URL (overrides config)')}
  ${a('--output <format>')}      ${d('Output format: text, json')}
  ${a('--quiet')}                ${d('Suppress non-essential output')}
  ${a('--verbose')}              ${d('Print HTTP request/response details')}
  ${a('--timeout <seconds>')}    ${d('Request timeout (default: 60)')}
  ${a('--no-color')}             ${d('Disable ANSI colors')}
  ${a('--dry-run')}              ${d('Show what would happen without executing')}
  ${a('--non-interactive')}      ${d('Disable interactive prompts (CI mode)')}
  ${a('--version')}              ${d('Print version and exit')}
  ${a('--help')}                 ${d('Show help')}

${b('Getting Help:')}
  ${d('Add --help after any command to see options and examples.')}
  ${d('For example:')} forloop story get --help
`);
  }

  private printCommandHelp(cmd: Command, out: NodeJS.WriteStream): void {
    const b = (s: string) => this.bold(s, out);
    const a = (s: string) => this.accent(s, out);
    const d = (s: string) => this.dim(s, out);

    out.write(`\n${cmd.description}\n`);
    if (cmd.usage) out.write(`${b('Usage:')} ${cmd.usage}\n`);
    if (cmd.options && cmd.options.length > 0) {
      const maxLen = Math.max(...cmd.options.map(o => o.flag.length));
      out.write(`\n${b('Options:')}\n`);
      for (const opt of cmd.options) {
        out.write(`  ${a(opt.flag.padEnd(maxLen + 2))} ${d(opt.description)}\n`);
      }
    }
    if (cmd.examples && cmd.examples.length > 0) {
      out.write(`\n${b('Examples:')}\n`);
      for (const ex of cmd.examples) {
        out.write(`  ${d(ex)}\n`);
      }
    }
    out.write(`\n${d('Global flags (--api-key, --output, --quiet, etc.) are always available.')}\n`);
    out.write(`${d('Run')} forloop --help ${d('for the full list.')}\n`);
  }

  private printChildren(node: CommandNode, prefix: string, out: NodeJS.WriteStream): void {
    const entries: Array<{ fullName: string; description: string }> = [];
    const seen = new Map<Command, string>();
    const collect = (n: CommandNode, p: string) => {
      for (const [name, child] of n.children) {
        if (child.command) {
          const existing = seen.get(child.command);
          if (existing) continue;
          seen.set(child.command, name);
          entries.push({ fullName: `${p} ${name}`, description: child.command.description });
        }
        if (child.children.size > 0) collect(child, `${p} ${name}`);
      }
    };
    collect(node, prefix);
    if (entries.length === 0) return;
    const maxLen = Math.max(...entries.map(e => e.fullName.length));
    for (const { fullName, description } of entries) {
      out.write(`  ${this.accent(fullName.padEnd(maxLen), out)}  ${this.dim(description, out)}\n`);
    }
  }
}

// Singleton registry with command aliases
const sprintGetCmd = createSprintCommands()['sprint get'];
const sprintListCmd = createSprintCommands()['sprint list'];
const sprintCreateCmd = createSprintCommands()['sprint create'];
const sprintUpdateCmd = createSprintCommands()['sprint update'];
const sprintDeleteCmd = createSprintCommands()['sprint delete'];

const storyCreateCmd = createStoryCommands()['story create'];
const storyGetCmd = createStoryCommands()['story get'];
const storyUpdateCmd = createStoryCommands()['story update'];
const storyDeleteCmd = createStoryCommands()['story delete'];

const agentHistoryCmd = createAgentCommands()['agent history'];
const agentDeveloperSprintCmd = createAgentCommands()['agent developer-sprint'];
const agentDeveloperStatusCmd = createAgentCommands()['agent developer-status'];

const fileUploadCmd = createFileCommands()['file upload'];
const fileListCmd = createFileCommands()['file list'];
const fileDeleteCmd = createFileCommands()['file delete'];
const fileDownloadCmd = createFileCommands()['file download'];

export const registry = new CommandRegistry({
  ...createAuthCommands(),
  ...createStoryCommands(),
  ...createSprintCommands(),
  ...createOrgCommands(),
  ...createTemplateCommands(),
  ...createAgentCommands(),
  ...createUserCommands(),
  ...createFileCommands(),
  ...createFolderCommands(),
  ...createSyncCommands(),

  // Aliases
  'sprint show': sprintGetCmd,
  'sprint info': sprintGetCmd,
  'agent status': agentDeveloperStatusCmd,
  'agent sprint': agentDeveloperSprintCmd,
});

export { CommandRegistry };
