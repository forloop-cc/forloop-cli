import type { Command } from '../command';
import { defineCommand } from '../command';
import { ForLoopAPIClient, getToken, resolveSprintId, getConfig, getForloopRoot } from '@forloop/opencode-plugin';
import * as fs from 'fs';
import * as path from 'path';

export function createSyncCommands(): Record<string, Command> {
  return {
    'sync aivy-folder': createSyncAivyFolderCommand(),
    'sync aivy-doc-get': createAivyDocGetCommand(),
    'sync s3-to-local': createS3ToLocalCommand(),
    'sync local-to-s3': createLocalToS3Command(),
  };
}

async function getClient(): Promise<{ client: ForLoopAPIClient } | null> {
  const config = getConfig();
  const token = await getToken();
  if (!token) { console.error('Error: No API token configured.'); process.exit(1); }
  return { client: new ForLoopAPIClient({ token, baseUrl: config.apiUrl }) };
}

function createSyncAivyFolderCommand(): Command {
  return defineCommand({
    name: 'sync aivy-folder',
    description: 'Ensure a doc_folder exists for file sync in the working sprint',
    usage: 'forloop sync aivy-folder [--sprint <id>] [--title <text>]',
    options: [
      { flag: '--sprint <id>', description: 'Target sprint ID', type: 'number' },
      { flag: '--title <text>', description: 'Doc folder title (default: "forloop Aivy doc")' },
    ],
    examples: ['forloop sync aivy-folder --sprint 1'],
    async run(_config, flags) {
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const resolution = await resolveSprintId(flags.sprint as number | undefined);
      if (!resolution.sprintId) { console.error('Error: No sprint ID resolved.'); process.exit(1); }
      const title = (flags.title as string) || 'forloop Aivy doc';
      const sprint = await client.getSprint(resolution.sprintId, { includeStories: true, includeFiles: false });
      const stories = Array.isArray(sprint?.stories) ? sprint.stories : [];
      const existing = stories.find((s: any) => s.type === 'doc_folder' && s.title?.toLowerCase() === title.toLowerCase());
      if (existing?.id) {
        console.log(`Doc folder already exists: #${existing.id} "${existing.title}"`);
        return;
      }
      const created = await client.createStory({
        sprintId: resolution.sprintId,
        type: 'doc_folder',
        title,
        status: 'todo',
      });
      console.log(`Doc folder created: #${created.id} "${created.title}"`);
    },
  });
}

function createAivyDocGetCommand(): Command {
  return defineCommand({
    name: 'sync aivy-doc-get',
    description: 'Get the doc_folder story ID for linking files',
    usage: 'forloop sync aivy-doc-get [--sprint <id>] [--title <text>]',
    options: [
      { flag: '--sprint <id>', description: 'Target sprint ID', type: 'number' },
      { flag: '--title <text>', description: 'Doc folder title (default: "forloop Aivy doc")' },
    ],
    examples: ['forloop sync aivy-doc-get --sprint 1'],
    async run(_config, flags) {
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const resolution = await resolveSprintId(flags.sprint as number | undefined);
      if (!resolution.sprintId) { console.error('Error: No sprint ID resolved.'); process.exit(1); }
      const title = (flags.title as string) || 'forloop Aivy doc';
      const sprint = await client.getSprint(resolution.sprintId, { includeStories: true, includeFiles: false });
      const stories = Array.isArray(sprint?.stories) ? sprint.stories : [];
      const existing = stories.find((s: any) => s.type === 'doc_folder' && s.title?.toLowerCase() === title.toLowerCase());
      if (existing?.id) {
        console.log(`Doc folder: #${existing.id} "${existing.title}" (Sprint #${resolution.sprintId})`);
      } else {
        console.log(`Doc folder not found. Run: forloop sync aivy-folder --sprint ${resolution.sprintId}`);
      }
    },
  });
}

function createS3ToLocalCommand(): Command {
  return defineCommand({
    name: 'sync s3-to-local',
    description: 'Download sprint files from S3 to local ~/.forloop/ directory',
    usage: 'forloop sync s3-to-local [--sprint <id>] [--no-knowledge] [--no-plans] [--no-tasks] [--overwrite]',
    options: [
      { flag: '--sprint <id>', description: 'Target sprint ID', type: 'number' },
      { flag: '--no-knowledge', description: 'Skip knowledge files' },
      { flag: '--no-plans', description: 'Skip plan files' },
      { flag: '--no-tasks', description: 'Skip task files' },
      { flag: '--overwrite', description: 'Overwrite existing local files' },
    ],
    examples: ['forloop sync s3-to-local --sprint 1'],
    async run(_config, flags) {
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const resolution = await resolveSprintId(flags.sprint as number | undefined);
      if (!resolution.sprintId) { console.error('Error: No sprint ID resolved.'); process.exit(1); }
      const files = await client.getSprintFiles(resolution.sprintId);
      const localRoot = getForloopRoot(resolution.sprintId);
      fs.mkdirSync(localRoot, { recursive: true });
      let downloaded = 0;
      let skipped = 0;
      for (const file of files) {
        const name = (file.originalName || file.filename || '').toLowerCase();
        const skip = (flags.noKnowledge && name.startsWith('knowledge-'))
          || (flags.noPlans && name.startsWith('plan-'))
          || (flags.noTasks && name.startsWith('task-'));
        if (skip) { skipped++; continue; }
        const open = await client.getFileOpenUrl(file.id);
        const res = await fetch(open.url);
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          const kind = name.startsWith('knowledge-') ? 'knowledge' : name.startsWith('plan-') ? 'plan' : name.startsWith('task-') ? 'task' : 'other';
          const dir = path.join(localRoot, kind);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, name), buf);
          downloaded++;
        }
      }
      console.log(`Sync complete: ${downloaded} downloaded, ${skipped} skipped.`);
    },
  });
}

function createLocalToS3Command(): Command {
  return defineCommand({
    name: 'sync local-to-s3',
    description: 'Upload a local file to sprint S3',
    usage: 'forloop sync local-to-s3 --path <path> [--sprint <id>] [--folder <text>] [--delete]',
    options: [
      { flag: '--path <path>', description: 'Local file path', required: true },
      { flag: '--sprint <id>', description: 'Target sprint ID', type: 'number' },
      { flag: '--folder <text>', description: 'Remote folder (e.g., project/plans)' },
      { flag: '--delete', description: 'Delete remote file instead of uploading' },
    ],
    examples: ['forloop sync local-to-s3 --path ~/.forloop/sprint-1/plan/plan.md --sprint 1'],
    async run(_config, flags) {
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const resolution = await resolveSprintId(flags.sprint as number | undefined);
      if (!resolution.sprintId) { console.error('Error: No sprint ID resolved.'); process.exit(1); }
      const filePath = flags.path as string;
      if (!fs.existsSync(filePath)) { console.error(`Error: File not found: ${filePath}`); process.exit(1); }
      const fileBuf = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      const contentType = 'text/markdown';
      const folder = (flags.folder as string) || 'project';
      const presign = await client.createPresignedUpload({
        sprintId: resolution.sprintId,
        contentType,
        originalName: fileName,
        folder,
      });
      await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: fileBuf,
      });
      await client.completeUpload({
        sprintId: resolution.sprintId,
        fileName: presign.fileName,
        originalName: fileName,
        fileType: contentType,
        size: fileBuf.length,
        folder,
      });
      console.log(`Synced: ${fileName} -> Sprint #${resolution.sprintId}`);
    },
  });
}
