import type { Command } from '../command';
import { defineCommand } from '../command';
import { ForLoopAPIClient, getToken, getConfig } from '@forloop/opencode-plugin';

export function createFolderCommands(): Record<string, Command> {
  return {
    'folder create': createFolderCreateCommand(),
  };
}

function createFolderCreateCommand(): Command {
  return defineCommand({
    name: 'folder create',
    description: 'Create a document folder for storing files',
    usage: 'forloop folder create --title <text> --sprint <id> [--description <text>] [--permissions <type>]',
    options: [
      { flag: '--title <text>', description: 'Folder name', required: true },
      { flag: '--sprint <id>', description: 'Target sprint ID', required: true, type: 'number' },
      { flag: '--description <text>', description: 'Folder description' },
      { flag: '--permissions <type>', description: 'public, team, private (default: team)' },
    ],
    examples: ['forloop folder create --title "Project Docs" --sprint 1 --permissions team'],
    async run(_config, flags) {
      const config = getConfig();
      const token = await getToken();
      if (!token) { console.error('Error: No API token configured.'); process.exit(1); }
      const client = new ForLoopAPIClient({ token, baseUrl: config.apiUrl });
      const story = await client.createStory({
        title: flags.title as string,
        description: flags.description as string | undefined,
        sprintId: flags.sprint as number,
        type: 'doc_folder',
        status: 'todo',
        metadata: JSON.stringify({ permissions: flags.permissions || 'team' }),
      });
      console.log(`Document folder created: #${story.id} - ${story.title}`);
    },
  });
}
