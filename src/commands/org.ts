import type { Command } from '../command';
import { defineCommand } from '../command';
import { ForLoopAPIClient, getToken, getConfig } from '@forloop/opencode-plugin';

export function createOrgCommands(): Record<string, Command> {
  return {
    'org list': createOrgListCommand(),
    'org get': createOrgGetCommand(),
    'org create': createOrgCreateCommand(),
    'org update': createOrgUpdateCommand(),
  };
}

async function getClient(): Promise<{ client: ForLoopAPIClient } | null> {
  const config = getConfig();
  const token = await getToken();
  if (!token) {
    console.error('Error: No API token configured. Run: forloop auth login --api-key <token>');
    process.exit(1);
  }
  return { client: new ForLoopAPIClient({ token, baseUrl: config.apiUrl }) };
}

function createOrgListCommand(): Command {
  return defineCommand({
    name: 'org list',
    description: 'List organizations you belong to',
    usage: 'forloop org list [--owned-only]',
    options: [
      { flag: '--owned-only', description: 'List only organizations you own' },
    ],
    examples: ['forloop org list', 'forloop org list --owned-only'],
    async run(_config, flags) {
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const orgs = flags.ownedOnly ? await client.getOwnedOrganizations() : await client.listOrganizations();
      if (!orgs.length) { console.log('No organizations found.'); return; }
      const lines = ['Organizations:', ''];
      for (const org of orgs) {
        const role = org.members?.[0]?.role || 'member';
        lines.push(`  #${org.id} ${org.name} (${role})`);
      }
      console.log(lines.join('\n'));
    },
  });
}

function createOrgGetCommand(): Command {
  return defineCommand({
    name: 'org get',
    description: 'Get organization details',
    usage: 'forloop org get --id <number>',
    options: [
      { flag: '--id <number>', description: 'Organization ID', required: true, type: 'number' },
    ],
    examples: ['forloop org get --id 1'],
    async run(_config, flags) {
      if (!flags.id) { console.error('Error: --id is required'); process.exit(1); }
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const org = await client.getOrganization(flags.id as number);
      console.log(`Organization #${org.id}: ${org.name}`);
      console.log(`Type: ${org.type || 'user'}`);
      if (org.description) console.log(`Description: ${org.description}`);
    },
  });
}

function createOrgCreateCommand(): Command {
  return defineCommand({
    name: 'org create',
    description: 'Create a new organization (requires Team/Enterprise tier)',
    usage: 'forloop org create --name <text> [--description <text>]',
    options: [
      { flag: '--name <text>', description: 'Organization name', required: true },
      { flag: '--description <text>', description: 'Organization description' },
    ],
    examples: ['forloop org create --name "My Team" --description "Engineering team"'],
    async run(_config, flags) {
      if (!flags.name) { console.error('Error: --name is required'); process.exit(1); }
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const org = await client.createOrganization({
        name: flags.name as string,
        description: flags.description as string | undefined,
      });
      console.log(`Organization created: #${org.id} - ${org.name}`);
    },
  });
}

function createOrgUpdateCommand(): Command {
  return defineCommand({
    name: 'org update',
    description: 'Update organization details',
    usage: 'forloop org update --id <number> [--name <text>] [--description <text>]',
    options: [
      { flag: '--id <number>', description: 'Organization ID', required: true, type: 'number' },
      { flag: '--name <text>', description: 'New name' },
      { flag: '--description <text>', description: 'New description' },
    ],
    examples: ['forloop org update --id 1 --name "New Name"'],
    async run(_config, flags) {
      if (!flags.id) { console.error('Error: --id is required'); process.exit(1); }
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const org = await client.updateOrganization(flags.id as number, {
        name: flags.name as string | undefined,
        description: flags.description as string | undefined,
      });
      console.log(`Organization #${org.id} updated successfully.`);
    },
  });
}
