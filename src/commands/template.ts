import type { Command } from '../command';
import { defineCommand } from '../command';
import { ForLoopAPIClient, getToken, getConfig } from '@forloop/opencode-plugin';

export function createTemplateCommands(): Record<string, Command> {
  return {
    'template list': createTemplateListCommand(),
  };
}

function createTemplateListCommand(): Command {
  return defineCommand({
    name: 'template list',
    description: 'List available story templates',
    usage: 'forloop template list',
    examples: ['forloop template list'],
    async run(_config) {
      const config = getConfig();
      const token = await getToken();
      if (!token) { console.error('Error: No API token configured.'); process.exit(1); }
      const client = new ForLoopAPIClient({ token, baseUrl: config.apiUrl });
      const templates = await client.listTemplates();
      const active = templates.filter(t => !t.deletedAt);
      if (!active.length) { console.log('No templates found.'); return; }
      const lines = ['Available Templates:', ''];
      for (const t of active) {
        const fields = JSON.parse(t.fields);
        const fieldNames = fields.map((f: any) => f.label).join(', ');
        lines.push(`  ${t.name} (slug: ${t.slug})`);
        lines.push(`    ${t.description}`);
        lines.push(`    Fields: ${fieldNames}`);
        lines.push('');
      }
      console.log(lines.join('\n'));
    },
  });
}
