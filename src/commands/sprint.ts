import type { Command } from '../command';
import { defineCommand } from '../command';
import { ForLoopAPIClient, getToken, resolveSprintId, getConfig } from '@forloop/opencode-plugin';

export function createSprintCommands(): Record<string, Command> {
  return {
    'sprint get': createSprintGetCommand(),
    'sprint list': createSprintListCommand(),
    'sprint create': createSprintCreateCommand(),
    'sprint update': createSprintUpdateCommand(),
    'sprint delete': createSprintDeleteCommand(),
  };
}

async function getClient(): Promise<{ client: ForLoopAPIClient } | null> {
  const config = getConfig();
  const token = await getToken();
  if (!token) {
    console.error('Error: No API token configured. Run: forloop auth login --api-key <token>');
    process.exit(1);
  }
  const client = new ForLoopAPIClient({ token, baseUrl: config.apiUrl });
  return { client };
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function createSprintGetCommand(): Command {
  return defineCommand({
    name: 'sprint get',
    description: 'Get sprint details including stories and files',
    usage: 'forloop sprint get --id <number>',
    options: [
      { flag: '--id <number>', description: 'Sprint ID (auto-detected if not provided)', type: 'number' },
      { flag: '--no-stories', description: 'Exclude stories from response' },
      { flag: '--no-files', description: 'Exclude files from response' },
    ],
    examples: ['forloop sprint get --id 456', 'forloop sprint get --id 456 --no-files'],
    async run(_config, flags) {
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const resolution = await resolveSprintId(flags.id as number | undefined);
      if (!resolution.sprintId) {
        console.error('Error: No sprint ID resolved. Use --id, set FORLOOP_SPRINT_ID, or use a sprint-XXX branch.');
        process.exit(1);
      }
      const sprint = await client.getSprint(resolution.sprintId, {
        includeStories: !flags.noStories,
        includeFiles: !flags.noFiles,
      });
      const lines = [
        `Sprint #${sprint.id}: ${sprint.title}`,
        `Status: ${sprint.status}`,
        `Period: ${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)}`,
        `Stories: ${sprint.stories?.length || 0}`,
      ];
      if (sprint.stories?.length) {
        lines.push('', 'Stories:', '');
        for (const story of sprint.stories) {
          const icons: Record<string, string> = { todo: '[ ]', in_progress: '[>]', done: '[x]', blocked: '[!]' };
          lines.push(`  ${icons[story.status] || '[?]'} #${story.id} ${story.title} (${story.status})`);
        }
      }
      console.log(lines.join('\n'));
    },
  });
}

function createSprintListCommand(): Command {
  return defineCommand({
    name: 'sprint list',
    description: 'List all accessible sprints',
    usage: 'forloop sprint list [--org-id <id>] [--include-system-org]',
    options: [
      { flag: '--org-id <id>', description: 'Filter by organization ID', type: 'number' },
      { flag: '--include-system-org', description: 'Include system organization sprints' },
    ],
    examples: ['forloop sprint list', 'forloop sprint list --org-id 1'],
    async run(_config, flags) {
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const params: Record<string, string> = {};
      if (flags.orgId) params.organizationId = String(flags.orgId);
      const sprints = await client.listSprints(params);
      if (!sprints.length) { console.log('No sprints found.'); return; }
      const lines = ['Sprints:', ''];
      for (const sprint of sprints) {
        const orgInfo = sprint.organizationName ? ` (${sprint.organizationName})` : '';
        lines.push(`  #${sprint.id} ${sprint.title}${orgInfo} - ${sprint.status}`);
      }
      console.log(lines.join('\n'));
    },
  });
}

function createSprintCreateCommand(): Command {
  return defineCommand({
    name: 'sprint create',
    description: 'Create a new sprint',
    usage: 'forloop sprint create --title <text> --start-date <YYYY-MM-DD> --end-date <YYYY-MM-DD> [flags]',
    options: [
      { flag: '--title <text>', description: 'Sprint title', required: true },
      { flag: '--start-date <date>', description: 'Start date (YYYY-MM-DD)', required: true },
      { flag: '--end-date <date>', description: 'End date (YYYY-MM-DD)', required: true },
      { flag: '--description <text>', description: 'Sprint description' },
      { flag: '--private', description: 'Make sprint private' },
      { flag: '--org-id <id>', description: 'Organization ID', type: 'number' },
    ],
    examples: ['forloop sprint create --title "Sprint 15" --start-date 2026-06-09 --end-date 2026-06-23'],
    async run(_config, flags) {
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      if (!flags.title || !flags.startDate || !flags.endDate) {
        console.error('Error: --title, --start-date, and --end-date are required');
        process.exit(1);
      }
      const sprint = await client.createSprint({
        title: flags.title as string,
        description: flags.description as string | undefined,
        startDate: flags.startDate as string,
        endDate: flags.endDate as string,
        isPrivate: flags.private === true,
        organizationId: flags.orgId as number | undefined,
      });
      console.log(`Sprint created: #${sprint.id} - ${sprint.title}`);
      console.log(`Period: ${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)}`);
    },
  });
}

function createSprintUpdateCommand(): Command {
  return defineCommand({
    name: 'sprint update',
    description: 'Update sprint details',
    usage: 'forloop sprint update --id <number> [flags]',
    options: [
      { flag: '--id <number>', description: 'Sprint ID', required: true, type: 'number' },
      { flag: '--title <text>', description: 'New title' },
      { flag: '--description <text>', description: 'New description' },
      { flag: '--start-date <date>', description: 'New start date' },
      { flag: '--end-date <date>', description: 'New end date' },
      { flag: '--private', description: 'Set visibility to private' },
    ],
    examples: ['forloop sprint update --id 456 --title "Updated Sprint"'],
    async run(_config, flags) {
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const updateData: Record<string, unknown> = {};
      if (flags.title !== undefined) updateData.title = flags.title;
      if (flags.description !== undefined) updateData.description = flags.description;
      if (flags.startDate !== undefined) updateData.startDate = flags.startDate;
      if (flags.endDate !== undefined) updateData.endDate = flags.endDate;
      if (flags.private !== undefined) updateData.isPrivate = true;
      if (Object.keys(updateData).length === 0) {
        console.error('Error: at least one field to update is required');
        process.exit(1);
      }
      const sprint = await client.updateSprint(flags.id as number, updateData);
      console.log(`Sprint #${sprint.id} updated successfully.`);
    },
  });
}

function createSprintDeleteCommand(): Command {
  return defineCommand({
    name: 'sprint delete',
    description: 'Delete a sprint permanently',
    usage: 'forloop sprint delete --id <number> --confirm',
    options: [
      { flag: '--id <number>', description: 'Sprint ID', required: true, type: 'number' },
      { flag: '--confirm', description: 'Confirm deletion' },
    ],
    examples: ['forloop sprint delete --id 456 --confirm'],
    async run(_config, flags) {
      if (!flags.confirm) {
        console.error('Error: --confirm is required to permanently delete a sprint.');
        process.exit(1);
      }
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      await client.deleteSprint(flags.id as number);
      console.log(`Sprint #${flags.id} deleted successfully.`);
    },
  });
}
