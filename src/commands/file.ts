import type { Command } from '../command';
import { defineCommand } from '../command';
import { ForLoopAPIClient, getToken, getConfig } from '@forloop/opencode-plugin';
import * as fs from 'fs';
import * as path from 'path';

export function createFileCommands(): Record<string, Command> {
  return {
    'file upload': createFileUploadCommand(),
    'file list': createFileListCommand(),
    'file delete': createFileDeleteCommand(),
    'file download': createFileDownloadCommand(),
  };
}

async function getClient(): Promise<{ client: ForLoopAPIClient } | null> {
  const config = getConfig();
  const token = await getToken();
  if (!token) { console.error('Error: No API token configured.'); process.exit(1); }
  return { client: new ForLoopAPIClient({ token, baseUrl: config.apiUrl }) };
}

const mimeTypes: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.pdf': 'application/pdf', '.txt': 'text/plain',
  '.md': 'text/markdown', '.json': 'application/json', '.csv': 'text/csv',
  '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
};

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function createFileUploadCommand(): Command {
  return defineCommand({
    name: 'file upload',
    description: 'Upload a file to a sprint via presigned S3 URL',
    usage: 'forloop file upload --path <path> --sprint <id> [--description <text>] [--folder <text>]',
    options: [
      { flag: '--path <path>', description: 'Local file path', required: true },
      { flag: '--sprint <id>', description: 'Target sprint ID', required: true, type: 'number' },
      { flag: '--description <text>', description: 'File description' },
      { flag: '--folder <text>', description: 'S3 folder within sprint' },
    ],
    examples: ['forloop file upload --path ./report.pdf --sprint 1 --folder docs'],
    async run(_config, flags) {
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const filePath = flags.path as string;
      if (!fs.existsSync(filePath)) { console.error(`Error: File not found: ${filePath}`); process.exit(1); }
      const fileContent = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      const ext = path.extname(fileName);
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const presign = await client.createPresignedUpload({
        sprintId: flags.sprint as number,
        contentType,
        originalName: fileName,
        folder: flags.folder as string | undefined,
      });
      const uploadResponse = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType, 'Content-Length': String(fileContent.length) },
        body: fileContent,
      });
      if (!uploadResponse.ok) {
        console.error(`Error: Upload failed (${uploadResponse.status})`);
        process.exit(1);
      }
      const complete = await client.completeUpload({
        sprintId: flags.sprint as number,
        fileName: presign.fileName,
        originalName: fileName,
        fileType: contentType,
        size: fileContent.length,
        folder: flags.folder as string | undefined,
      });
      console.log(`File uploaded: ${fileName} (${formatSize(fileContent.length)})`);
      console.log(`URL: ${complete.url}`);
    },
  });
}

function createFileListCommand(): Command {
  return defineCommand({
    name: 'file list',
    description: 'List files attached to a sprint',
    usage: 'forloop file list --sprint <id>',
    options: [
      { flag: '--sprint <id>', description: 'Sprint ID', required: true, type: 'number' },
    ],
    examples: ['forloop file list --sprint 1'],
    async run(_config, flags) {
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      const files = await client.getSprintFiles(flags.sprint as number);
      if (!files.length) { console.log('No files found.'); return; }
      const lines = [`Files in Sprint #${flags.sprint}:`, ''];
      for (const file of files) {
        lines.push(`  ${file.originalName || file.filename}`);
        lines.push(`    Size: ${formatSize(file.size)} | Type: ${file.fileType}`);
        lines.push(`    URL: ${file.url}`);
        lines.push('');
      }
      console.log(lines.join('\n'));
    },
  });
}

function createFileDeleteCommand(): Command {
  return defineCommand({
    name: 'file delete',
    description: 'Delete a file from a sprint permanently',
    usage: 'forloop file delete --id <number> --confirm',
    options: [
      { flag: '--id <number>', description: 'File ID', required: true, type: 'number' },
      { flag: '--confirm', description: 'Confirm deletion' },
    ],
    examples: ['forloop file delete --id 1 --confirm'],
    async run(_config, flags) {
      if (!flags.confirm) { console.error('Error: --confirm is required.'); process.exit(1); }
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      await client.deleteFile(flags.id as number);
      console.log(`File #${flags.id} deleted.`);
    },
  });
}

function createFileDownloadCommand(): Command {
  return defineCommand({
    name: 'file download',
    description: 'Get a download URL for a file',
    usage: 'forloop file download --id <number>',
    options: [
      { flag: '--id <number>', description: 'File ID', required: true, type: 'number' },
    ],
    examples: ['forloop file download --id 1'],
    async run(_config, flags) {
      const resolved = await getClient();
      if (!resolved) return;
      const { client } = resolved;
      await client.logFileRead(flags.id as number);
      const download = await client.getFileDownloadUrl(flags.id as number);
      console.log(`Download URL: ${download.url}`);
    },
  });
}
