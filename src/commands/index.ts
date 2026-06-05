import type { Command } from '../command';
import { createAuthCommands } from './auth/index';
import { createStoryCommands } from './story';
import { createSprintCommands } from './sprint';
import { createOrgCommands } from './org';
import { createTemplateCommands } from './template';
import { createAgentCommands } from './agent';
import { createUserCommands } from './user';
import { createFileCommands } from './file';
import { createFolderCommands } from './folder';
import { createSyncCommands } from './sync';

export function createCommands(): Record<string, Command> {
  return {
    ...createAuthCommands(),
    ...createStoryCommands(),
    ...createSprintCommands(),
    ...createOrgCommands(),
    ...createTemplateCommands(),
    ...createAgentCommands(),
    ...createUserCommands(),
    ...createFileCommands(),
    ...createFolderCommands(),
    ...createSyncCommands(),
  };
}
