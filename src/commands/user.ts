import type { Command } from '../command';
import { defineCommand } from '../command';
import { ForLoopAPIClient, getToken, getConfig } from '@forloop/opencode-plugin';

export function createUserCommands(): Record<string, Command> {
  return {
    'user profile': createUserProfileCommand(),
    'user quotas': createUserQuotasCommand(),
    'org quotas': createOrgQuotasCommand(),
  };
}

async function getClient(): Promise<{ client: ForLoopAPIClient } | null> {
  const config = getConfig();
  const token = await getToken();
  if (!token) { console.error('Error: No API token configured.'); process.exit(1); }
  return { client: new ForLoopAPIClient({ token, baseUrl: config.apiUrl }) };
}

function createUserProfileCommand(): Command {
  return defineCommand({
    name: 'user profile',
    description: 'Get current user profile',
    usage: 'forloop user profile',
    examples: ['forloop user profile'],
    async run(_config) {
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const profile = await client.getUserProfile();
      console.log(`User: ${profile.name || profile.email || 'Unknown'}`);
      console.log(`Email: ${profile.email}`);
      if (profile.tier) console.log(`Tier: ${profile.tier}`);
    },
  });
}

function createUserQuotasCommand(): Command {
  return defineCommand({
    name: 'user quotas',
    description: 'Check user quota limits',
    usage: 'forloop user quotas',
    examples: ['forloop user quotas'],
    async run(_config) {
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const quotas = await client.getUserQuotas();
      console.log('User Quotas:');
      console.log(JSON.stringify(quotas, null, 2));
    },
  });
}

function createOrgQuotasCommand(): Command {
  return defineCommand({
    name: 'org quotas',
    description: 'Get organization quota usage',
    usage: 'forloop org quotas --org-id <id>',
    options: [
      { flag: '--org-id <id>', description: 'Organization ID', required: true, type: 'number' },
    ],
    examples: ['forloop org quotas --org-id 1'],
    async run(_config, flags) {
      if (!flags.orgId) { console.error('Error: --org-id is required'); process.exit(1); }
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const quotas = await client.getOrganizationQuotas(flags.orgId as number);
      console.log('Organization Quotas:');
      console.log(JSON.stringify(quotas, null, 2));
    },
  });
}
