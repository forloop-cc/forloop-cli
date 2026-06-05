import type { Command } from '../command';
import { defineCommand } from '../command';
import { ForLoopAPIClient, getToken, resolveSprintId, getConfig } from '@forloop/opencode-plugin';

export function createAgentCommands(): Record<string, Command> {
  return {
    'agent history': createAgentHistoryCommand(),
    'agent developer-sprint': createDeveloperSprintCommand(),
    'agent developer-status': createDeveloperStatusCommand(),
  };
}

async function getClient(): Promise<{ client: ForLoopAPIClient } | null> {
  const config = getConfig();
  const token = await getToken();
  if (!token) { console.error('Error: No API token configured.'); process.exit(1); }
  return { client: new ForLoopAPIClient({ token, baseUrl: config.apiUrl }) };
}

function createAgentHistoryCommand(): Command {
  return defineCommand({
    name: 'agent history',
    description: 'View conversation history with AI agents from opencode sessions',
    usage: 'forloop agent history [--sprint <id>] [--limit <n>]',
    options: [
      { flag: '--sprint <id>', description: 'Sprint ID', type: 'number' },
      { flag: '--limit <n>', description: 'Number of messages (max 200, default 50)', type: 'number' },
    ],
    examples: ['forloop agent history --sprint 1 --limit 20'],
    async run(_config, flags) {
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const resolution = await resolveSprintId(flags.sprint as number | undefined);
      const sprintId = resolution.sprintId || flags.sprint as number;
      const history = await client.getConversationHistory({
        sprintId: sprintId as number | undefined,
        limit: (flags.limit as number) || 50,
      });
      const messages = history.messages || [];
      if (!messages.length) { console.log('No conversation history found.'); return; }
      console.log(`Conversation History (${history.total || messages.length} total):`);
      for (const msg of messages) {
        const preview = (msg.userMessage || '').substring(0, 80);
        console.log(`  ${preview}${preview.length >= 80 ? '...' : ''}`);
        if (msg.agentResponse) {
          const resp = msg.agentResponse.substring(0, 100);
          console.log(`    -> ${resp}${msg.agentResponse.length > 100 ? '...' : ''}`);
        }
        console.log('');
      }
    },
  });
}

function createDeveloperSprintCommand(): Command {
  return defineCommand({
    name: 'agent developer-sprint',
    description: 'Trigger the developer agent to implement sprint stories',
    usage: 'forloop agent developer-sprint --sprint <id> [--message <text>]',
    options: [
      { flag: '--sprint <id>', description: 'Sprint ID', required: true, type: 'number' },
      { flag: '--message <text>', description: 'Instructions for the developer agent' },
    ],
    examples: ['forloop agent developer-sprint --sprint 1 --message "Implement all planned tasks"'],
    async run(_config, flags) {
      if (!flags.sprint) { console.error('Error: --sprint is required'); process.exit(1); }
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const response = await client.chatWithAI({
        sprintId: flags.sprint as number,
        message: (flags.message as string) || 'Start implementing the sprint stories assigned to the developer agent',
        selectedAgentKey: 'forLoopTaskSupervisor',
        type: 'developer.sprint',
        metadata: { channel: 'developer_sprint' },
      });
      const taskId = response.taskId || response.id || 'unknown';
      console.log(`Developer sprint triggered:`);
      console.log(`  Task ID: ${taskId}`);
      console.log(`  Sprint: #${flags.sprint}`);
      console.log(`  Agent: forLoopTaskSupervisor`);
      console.log(`Check dashboard for story progress.`);
    },
  });
}

function createDeveloperStatusCommand(): Command {
  return defineCommand({
    name: 'agent developer-status',
    description: 'Check status of a running developer task',
    usage: 'forloop agent developer-status [--sprint <id>]',
    options: [
      { flag: '--sprint <id>', description: 'Sprint ID', type: 'number' },
    ],
    examples: ['forloop agent developer-status --sprint 1'],
    async run(_config, flags) {
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const resolution = await resolveSprintId(flags.sprint as number | undefined);
      if (!resolution.sprintId) { console.error('Error: No sprint ID resolved.'); process.exit(1); }
      const status = await client.getDeveloperStatus(resolution.sprintId);
      const sprint = status.sprint || {};
      if (!status.hasActiveTask) {
        console.log(`No active developer task.`);
        console.log(`Sprint #${resolution.sprintId}: ${sprint.storiesDone || 0}/${sprint.storiesTotal || 0} stories done.`);
        return;
      }
      const exec = status.execution || {};
      const task = status.task || {};
      console.log(`Developer Task: ${exec.status}`);
      console.log(`Sprint: #${resolution.sprintId}`);
      if (exec.startedAt) console.log(`Started: ${new Date(exec.startedAt).toLocaleString()}`);
      if (task.branchName) console.log(`Branch: ${task.branchName}`);
      if (task.errorMessage) console.log(`Error: ${task.errorMessage}`);
      console.log(`Progress: ${sprint.storiesDone || 0}/${sprint.storiesTotal || 0} done, ${sprint.storiesInProgress || 0} in progress.`);
    },
  });
}
