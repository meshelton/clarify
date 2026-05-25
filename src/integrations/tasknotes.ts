import type { App, TFile } from 'obsidian';
import type { TaskInfo } from './tasknotes-types';

export type { TaskInfo };

/**
 * Subset of the TaskNotes plugin instance we depend on. TaskNotes does not
 * publish a TS interface for their plugin class; this is the runtime shape
 * we probe for in `isTaskNotesPlugin` below.
 */
interface TaskNotesPlugin {
  cacheManager: {
    getTaskInfo(path: string): Promise<TaskInfo | null>;
  };
  openTaskEditModal(task: TaskInfo, onTaskUpdated?: (updated: TaskInfo) => void): void;
  openTaskEditModalForFile(file: TFile, errorMessage?: string): void;
  manifest?: { version: string };
}

/**
 * Adapter over the TaskNotes plugin. Probes for the API surface we depend on
 * at runtime; returns `null` if TaskNotes isn't installed or if any expected
 * method is missing. Centralizes the brittleness of reaching into another
 * plugin's internals — every other module imports the adapter, not
 * `app.plugins.plugins.tasknotes` directly.
 */
export interface TaskNotesAdapter {
  readonly version: string | undefined;
  /** Load TaskNotes' parsed view of a file by path. */
  getTaskInfo(path: string): Promise<TaskInfo | null>;
  /** Open the edit modal on a known TaskInfo. `onTaskUpdated` fires on save. */
  openEditModal(task: TaskInfo, onTaskUpdated?: (updated: TaskInfo) => void): void;
}

interface PluginsHost {
  plugins?: { plugins?: Record<string, unknown> };
}

const isTaskNotesPlugin = (p: unknown): p is TaskNotesPlugin => {
  if (!p || typeof p !== 'object') return false;
  const tn = p as Partial<TaskNotesPlugin>;
  return (
    typeof tn.openTaskEditModal === 'function' &&
    !!tn.cacheManager &&
    typeof tn.cacheManager.getTaskInfo === 'function'
  );
};

export const getTaskNotesAdapter = (app: App): TaskNotesAdapter | null => {
  const candidate = (app as unknown as PluginsHost).plugins?.plugins?.tasknotes;
  if (!isTaskNotesPlugin(candidate)) return null;
  return {
    version: candidate.manifest?.version,
    getTaskInfo: (path) => candidate.cacheManager.getTaskInfo(path),
    openEditModal: (task, onTaskUpdated) =>
      candidate.openTaskEditModal(task, onTaskUpdated),
  };
};
