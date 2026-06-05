import type { Command } from '../../command';
import { defineCommand } from '../../command';
import { getToken, setToken, clearToken, validateToken } from '@forloop/opencode-plugin';

export function createAuthCommands(): Record<string, Command> {
  return {
    'auth login': createAuthLoginCommand(),
    'auth status': createAuthStatusCommand(),
    'auth logout': createAuthLogoutCommand(),
  };
}

function createAuthLoginCommand(): Command {
  return defineCommand({
    name: 'auth login',
    description: 'Authenticate with ForLoop API key',
    usage: 'forloop auth login --api-key <token>',
    options: [
      { flag: '--api-key <token>', description: 'ForLoop API token (starts with floop_)', required: true },
    ],
    examples: [
      'forloop auth login --api-key floop_xxxx',
    ],
    async run(_config, flags) {
      const apiKey = flags.apiKey as string;
      if (!apiKey || !apiKey.startsWith('floop_')) {
        console.error('Error: --api-key is required and must start with "floop_"');
        process.exit(1);
      }
      const validation = await validateToken(apiKey);
      if (!validation.valid) {
        console.error(`Invalid token: ${validation.error}`);
        process.exit(1);
      }
      await setToken(apiKey);
      console.log('Authenticated successfully. Token saved to ~/.config/forloop/tokens.json');
    },
  });
}

function createAuthStatusCommand(): Command {
  return defineCommand({
    name: 'auth status',
    description: 'Check current authentication status',
    usage: 'forloop auth status',
    async run(_config) {
      const token = await getToken();
      if (token) {
        const masked = token.slice(0, 8) + '...' + token.slice(-4);
        const validation = await validateToken(token);
        console.log(`Token: ${masked}`);
        console.log(`Format: ${validation.valid ? 'valid' : 'invalid'}`);
      } else {
        console.log('Not authenticated');
        console.log('Run: forloop auth login --api-key <token>');
        process.exit(1);
      }
    },
  });
}

function createAuthLogoutCommand(): Command {
  return defineCommand({
    name: 'auth logout',
    description: 'Clear saved authentication token',
    usage: 'forloop auth logout',
    async run(_config) {
      await clearToken();
      console.log('Logged out. Token cleared.');
    },
  });
}
