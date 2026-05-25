/**
 * Type declarations for the in-process TaskNotes plugin API surface.
 *
 * Sourced from https://github.com/callumalpass/tasknotes (TaskNotes v4.9.0).
 * TaskNotes does NOT publish a public TypeScript API — this file hand-ports
 * only the types we actually call. If TaskNotes ships breaking API changes,
 * regenerate this file from their source.
 */

import type { TFile } from 'obsidian';

// Opaque sub-types we don't read.
export type TimeEntry = unknown;
export type TaskDependency = unknown;
export type Reminder = unknown;

export interface TaskInfo {
  id?: string;
  title: string;
  status: string;
  priority: string;
  due?: string;
  scheduled?: string;
  path: string;
  archived: boolean;
  tags?: string[];
  contexts?: string[];
  projects?: string[];
  recurrence?: string;
  recurrence_anchor?: 'scheduled' | 'completion';
  complete_instances?: string[];
  skipped_instances?: string[];
  completedDate?: string;
  timeEstimate?: number;
  timeEntries?: TimeEntry[];
  totalTrackedTime?: number;
  dateCreated?: string;
  dateModified?: string;
  icsEventId?: string[];
  googleCalendarEventId?: string;
  googleCalendarExceptionEventId?: string;
  googleCalendarExceptionOriginalScheduled?: string;
  googleCalendarMovedOriginalDates?: string[];
  reminders?: Reminder[];
  customProperties?: Record<string, unknown>;
  basesData?: unknown;
  blockedBy?: TaskDependency[];
  blocking?: string[];
  isBlocked?: boolean;
  isBlocking?: boolean;
  hasSubtasks?: boolean;
  details?: string;
  sortOrder?: string;
}

/** Minimal shape of the TaskNotes plugin instance that we depend on. */
export interface TaskNotesPlugin {
  cacheManager: {
    getTaskInfo(path: string): Promise<TaskInfo | null>;
  };
  openTaskEditModal(task: TaskInfo, onTaskUpdated?: (updated: TaskInfo) => void): void;
  openTaskEditModalForFile(file: TFile, errorMessage?: string): void;
  manifest?: { version: string };
}
