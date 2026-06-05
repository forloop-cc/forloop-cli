import type { Command } from '../command';
import { defineCommand } from '../command';
import { ForLoopAPIClient, getToken, resolveSprintId, getConfig } from '@forloop/opencode-plugin';

export function createStoryCommands(): Record<string, Command> {
  return {
    'story create': createStoryCreateCommand(),
    'story get': createStoryGetCommand(),
    'story update': createStoryUpdateCommand(),
    'story delete': createStoryDeleteCommand(),
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

function createStoryCreateCommand(): Command {
  return defineCommand({
    name: 'story create',
    description: 'Create a story. Use --type basic-task|basic-note for template-based stories, or omit for doc_folder.',
    usage: 'forloop story create --title <text> --sprint <id> [--type basic-task|basic-note] [flags]',
    options: [
      { flag: '--title <text>', description: 'Story title', required: true },
      { flag: '--sprint <id>', description: 'Target sprint ID', required: true, type: 'number' },
      { flag: '--type <type>', description: 'basic-task or basic-note. Omit for doc_folder.' },
      { flag: '--description <text>', description: 'Story description' },
      { flag: '--priority <priority>', description: 'low, medium, high, critical (default: medium)' },
      { flag: '--points <n>', description: 'Story points (0-10)', type: 'number' },
      { flag: '--assignee-agent <key>', description: 'AI agent key to assign to' },
    ],
    examples: [
      'forloop story create --title "Implement login" --sprint 1 --type basic-task --priority high --points 3',
      'forloop story create --title "Meeting notes" --sprint 1 --type basic-note',
      'forloop story create --title "Design Docs" --sprint 1',
    ],
    async run(_config, flags) {
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const sprintId = flags.sprint as number;
      if (!sprintId || !flags.title) {
        console.error('Error: --title and --sprint are required');
        process.exit(1);
      }
      const templateSlug = flags.type as string | undefined;
      if (templateSlug) {
        if (templateSlug !== 'basic-task' && templateSlug !== 'basic-note') {
          console.error('Error: --type must be "basic-task" or "basic-note"');
          process.exit(1);
        }
        const templates = await client.listTemplates();
        const template = templates.find(t => t.slug === templateSlug && !t.deletedAt);
        if (!template) {
          console.error(`Error: Template "${templateSlug}" not found`);
          process.exit(1);
        }
        const story = await client.createStory({
          title: flags.title as string,
          description: flags.description as string | undefined,
          sprintId,
          type: template.storyType || 'task',
          templateId: template.id,
          priority: (flags.priority as any) || 'medium',
          points: flags.points as number | undefined,
          assigneeAgentKey: flags.assigneeAgent as string | undefined,
          assigneeType: flags.assigneeAgent ? 'agent' : undefined,
          status: 'todo',
          metadata: JSON.stringify({
            taskTitle: flags.title as string,
            description: flags.description,
            status: 'not-started',
            priority: (flags.priority as string) || 'medium',
            points: flags.points,
          }),
        });
        console.log(`Story created: #${story.id} - ${story.title} (${story.type})`);
      } else {
        const story = await client.createStory({
          title: flags.title as string,
          description: flags.description as string | undefined,
          sprintId,
          type: 'doc_folder',
          priority: (flags.priority as any) || 'medium',
          status: 'todo',
        });
        console.log(`Doc folder created: #${story.id} - ${story.title}`);
      }
    },
  });
}

function createStoryGetCommand(): Command {
  return defineCommand({
    name: 'story get',
    description: 'Get story details including sprint info, assignee, and comments',
    usage: 'forloop story get --id <number>',
    options: [
      { flag: '--id <number>', description: 'Story ID', required: true, type: 'number' },
      { flag: '--no-comments', description: 'Exclude comments' },
    ],
    examples: ['forloop story get --id 123'],
    async run(_config, flags) {
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const storyId = flags.id as number;
      if (!storyId) { console.error('Error: --id is required'); process.exit(1); }
      const story = await client.getStory(storyId, { includeComments: !flags.noComments });
      const lines = [
        `Story #${story.id}: ${story.title}`,
        `Sprint: #${story.sprint?.id || 'N/A'} ${story.sprint?.title || ''}`,
        `Status: ${story.status}`,
        `Priority: ${story.priority}`,
        `Type: ${story.type}`,
      ];
      if (story.points) lines.push(`Points: ${story.points}`);
      if (story.assignee) lines.push(`Assignee: ${story.assignee.name || story.assignee.email || 'Unknown'}`);
      if (story.assigneeAgentKey) lines.push(`Agent: ${story.assigneeAgentKey}`);
      if (story.description) {
        lines.push('', 'Description:', story.description);
      }
      if (!flags.noComments && story.comments?.length) {
        lines.push('', `--- Comments (${story.comments.length}) ---`);
        for (const comment of story.comments) {
          const author = comment.authorAgentKey || comment.user?.name || 'Unknown';
          lines.push(`  ${author}: ${comment.content || comment.body || ''}`);
          if (comment.artifacts?.length) lines.push(`  Artifacts: ${comment.artifacts.join(', ')}`);
        }
      }
      console.log(lines.join('\n'));
    },
  });
}

function createStoryUpdateCommand(): Command {
  return defineCommand({
    name: 'story update',
    description: 'Update story fields',
    usage: 'forloop story update --id <number> [flags]',
    options: [
      { flag: '--id <number>', description: 'Story ID', required: true, type: 'number' },
      { flag: '--title <text>', description: 'New title' },
      { flag: '--description <text>', description: 'New description' },
      { flag: '--status <status>', description: 'todo, in_progress, done, blocked' },
      { flag: '--priority <priority>', description: 'low, medium, high, critical' },
      { flag: '--points <n>', description: 'Story points (0-10)', type: 'number' },
    ],
    examples: ['forloop story update --id 123 --status in_progress'],
    async run(_config, flags) {
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const storyId = flags.id as number;
      if (!storyId) { console.error('Error: --id is required'); process.exit(1); }
      const data: Record<string, unknown> = {};
      if (flags.title !== undefined) data.title = flags.title;
      if (flags.description !== undefined) data.description = flags.description;
      if (flags.status !== undefined) data.status = flags.status;
      if (flags.priority !== undefined) data.priority = flags.priority;
      if (flags.points !== undefined) data.points = flags.points;
      if (Object.keys(data).length === 0) {
        console.error('Error: at least one field to update is required');
        process.exit(1);
      }
      const story = await client.updateStory(storyId, data);
      console.log(`Story #${story.id} updated successfully.`);
    },
  });
}

function createStoryDeleteCommand(): Command {
  return defineCommand({
    name: 'story delete',
    description: 'Delete a story',
    usage: 'forloop story delete --id <number> --confirm',
    options: [
      { flag: '--id <number>', description: 'Story ID', required: true, type: 'number' },
      { flag: '--confirm', description: 'Confirm deletion' },
    ],
    examples: ['forloop story delete --id 123 --confirm'],
    async run(_config, flags) {
      if (!flags.confirm) {
        console.error('Error: --confirm is required to permanently delete a story.');
        process.exit(1);
      }
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      await client.deleteStory(flags.id as number);
      console.log(`Story #${flags.id} deleted successfully.`);
    },
  });
}
