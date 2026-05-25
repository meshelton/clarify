/**
 * VENDORED FROM TaskNotes (https://github.com/callumalpass/tasknotes)
 *
 * Source: https://raw.githubusercontent.com/callumalpass/tasknotes/refs/heads/main/src/types.ts
 * Last synced: 2026-05-25 (main branch — pin to a tag if upstream stability becomes a concern)
 *
 * License: MIT (upstream project license)
 *
 * Re-sync workflow: re-fetch the file from the URL above whenever TaskNotes
 * ships a release that mentions changes to TaskInfo / FieldMapping / the
 * field naming conventions, and bump the "Last synced" date. Esbuild
 * tree-shakes unused exports so the runtime constants below do not bloat
 * the bundle unless we import them.
 *
 * Do not hand-edit this file — changes get clobbered on re-sync.
 */

import type { TAbstractFile } from "obsidian";

// View types (active views)
export const MINI_CALENDAR_VIEW_TYPE = "tasknotes-mini-calendar-view";
export const TASK_LIST_VIEW_TYPE = "tasknotes-task-list-view";
export const AGENDA_VIEW_TYPE = "tasknotes-agenda-view";
export const POMODORO_VIEW_TYPE = "tasknotes-pomodoro-view";
export const POMODORO_STATS_VIEW_TYPE = "tasknotes-pomodoro-stats-view";
export const STATS_VIEW_TYPE = "tasknotes-stats-view";
export const KANBAN_VIEW_TYPE = "tasknotes-kanban-view";
export const SUBTASK_WIDGET_VIEW_TYPE = "tasknotes-subtask-widget-view";

// Bases view IDs (for Bases plugin integration)
export const BASES_CALENDAR_VIEW_ID = "tasknotesCalendar";

// Event types
export const EVENT_DATE_SELECTED = "date-selected";
export const EVENT_TAB_CHANGED = "tab-changed";
export const EVENT_DATA_CHANGED = "data-changed";
export const EVENT_TASK_UPDATED = "task-updated";
export const EVENT_TASK_DELETED = "task-deleted";
export const EVENT_POMODORO_START = "pomodoro-start";
export const EVENT_POMODORO_COMPLETE = "pomodoro-complete";
export const EVENT_POMODORO_INTERRUPT = "pomodoro-interrupt";
export const EVENT_POMODORO_TICK = "pomodoro-tick";
export const EVENT_TIMEBLOCKING_TOGGLED = "timeblocking-toggled";
export const EVENT_TIMEBLOCK_UPDATED = "timeblock-updated";
export const EVENT_TIMEBLOCK_DELETED = "timeblock-deleted";
export const EVENT_DATE_CHANGED = "date-changed";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
	[key: string]: JsonValue;
}

// Calendar colorization modes
export type ColorizeMode = "tasks" | "notes" | "daily";

// Calendar display modes
export type CalendarDisplayMode = "month" | "agenda";

// Task sorting and grouping types
export type TaskSortKey =
	| "due"
	| "scheduled"
	| "priority"
	| "status"
	| "title"
	| "dateCreated"
	| "completedDate"
	| "tags"
	| `user:${string}`;
export type TaskGroupKey =
	| "none"
	| "priority"
	| "context"
	| "project"
	| "due"
	| "scheduled"
	| "status"
	| "tags"
	| "completedDate"
	| `user:${string}`;
export type SortDirection = "asc" | "desc";

// New Advanced Filtering System Types

// A single filter rule
export interface FilterCondition {
	type: "condition";
	id: string;
	property: FilterProperty;
	operator: FilterOperator;
	value: string | string[] | number | boolean | null;
}

// A logical grouping of conditions or other groups
export interface FilterGroup {
	type: "group";
	id: string;
	conjunction: "and" | "or";
	children: FilterNode[];
}

// Union type for filter nodes
export type FilterNode = FilterCondition | FilterGroup;

// The main query structure, a single root group with display properties
export interface FilterQuery extends FilterGroup {
	sortKey?: TaskSortKey;
	sortDirection?: SortDirection;
	groupKey?: TaskGroupKey;
	subgroupKey?: TaskGroupKey;
}

// A named, persistent configuration that encapsulates the entire state
export interface SavedView {
	id: string;
	name: string;
	query: FilterQuery;
	viewOptions?: { [key: string]: boolean };
	visibleProperties?: string[];
}

// Property and operator definitions for the advanced filtering system
export type FilterProperty =
	| ""
	| "title"
	| "path"
	| "status"
	| "priority"
	| "tags"
	| "contexts"
	| "projects"
	| "blockedBy"
	| "blocking"
	| "due"
	| "scheduled"
	| "completedDate"
	| "dateCreated"
	| "dateModified"
	| "archived"
	| "hasSubtasks"
	| "dependencies.isBlocked"
	| "dependencies.isBlocking"
	| "timeEstimate"
	| "recurrence"
	| "status.isCompleted"
	| `user:${string}`;

export type FilterOperator =
	| "is"
	| "is-not"
	| "contains"
	| "does-not-contain"
	| "is-before"
	| "is-after"
	| "is-on-or-before"
	| "is-on-or-after"
	| "is-empty"
	| "is-not-empty"
	| "is-checked"
	| "is-not-checked"
	| "is-greater-than"
	| "is-less-than"
	| "is-greater-than-or-equal"
	| "is-less-than-or-equal";

// Property metadata for UI generation
export interface PropertyDefinition {
	id: FilterProperty;
	label: string;
	category: "text" | "select" | "date" | "boolean" | "numeric" | "special";
	supportedOperators: FilterOperator[];
	valueInputType: "text" | "select" | "multi-select" | "date" | "number" | "none";
}

// Operator metadata for UI generation
export interface OperatorDefinition {
	id: FilterOperator;
	label: string;
	requiresValue: boolean;
}

export interface FilterOptions {
	statuses: readonly StatusConfig[];
	priorities: readonly PriorityConfig[];
	contexts: readonly string[];
	projects: readonly string[];
	tags: readonly string[];
	folders: readonly string[];
	userProperties?: readonly PropertyDefinition[];
}

// Time and date related types
export interface TimeInfo {
	hours: number;
	minutes: number;
}

// Task types
export type TaskDependencyRelType =
	| "FINISHTOSTART"
	| "FINISHTOFINISH"
	| "STARTTOSTART"
	| "STARTTOFINISH";

export interface TaskDependency {
	uid: string;
	reltype: TaskDependencyRelType;
	gap?: string;
}

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

export interface TaskCreationData extends Partial<TaskInfo> {
	details?: string;
	parentNote?: string;
	creationContext?: "inline-conversion" | "manual-creation" | "modal-inline-creation" | "api" | "import" | "ics-event";
	customFrontmatter?: Record<string, unknown>;
}

export interface TimeEntry {
	startTime: string;
	endTime?: string;
	description?: string;
	duration?: number;
}

export interface Reminder {
	id: string;
	type: "absolute" | "relative";
	relatedTo?: "due" | "scheduled";
	offset?: string;
	absoluteTime?: string;
	description?: string;
}

export interface TimeBlock {
	id: string;
	title: string;
	startTime: string;
	endTime: string;
	attachments?: string[];
	color?: string;
	description?: string;
}

export interface NoteInfo {
	title: string;
	tags: string[];
	path: string;
	createdDate?: string;
	lastModified?: number;
}

export interface FileIndex {
	taskFiles: IndexedFile[];
	noteFiles: IndexedFile[];
	lastIndexed: number;
}

export interface IndexedFile {
	path: string;
	mtime: number;
	ctime: number;
	tags?: string[];
	isTask?: boolean;
	cachedInfo?: TaskInfo | NoteInfo;
}

export interface TaskFrontmatter {
	title: string;
	dateCreated: string;
	dateModified: string;
	status: "open" | "in-progress" | "done";
	due?: string;
	scheduled?: string;
	tags: string[];
	priority: "low" | "normal" | "high";
	contexts?: string[];
	projects?: string[];
	recurrence?: string;
	complete_instances?: string[];
	completedDate?: string;
	timeEstimate?: number;
	timeEntries?: TimeEntry[];
}

export interface NoteFrontmatter {
	title: string;
	dateCreated: string;
	dateModified?: string;
	tags?: string[];
}

export interface DailyNoteFrontmatter {
	title?: string;
	dateCreated?: string;
	dateModified?: string;
	tags?: string[];
	timeblocks?: TimeBlock[];
}

export interface FileEventHandlers {
	modify?: (file: TAbstractFile) => void;
	delete?: (file: TAbstractFile) => void;
	rename?: (file: TAbstractFile, oldPath: string) => void;
	create?: (file: TAbstractFile) => void;
}

// Pomodoro types
export interface PomodoroTimePeriod {
	startTime: string;
	endTime?: string;
}

export interface PomodoroSession {
	id: string;
	taskPath?: string;
	startTime: string;
	endTime?: string;
	plannedDuration: number;
	type: "work" | "short-break" | "long-break";
	completed: boolean;
	interrupted?: boolean;
	activePeriods: PomodoroTimePeriod[];
}

export interface PomodoroState {
	isRunning: boolean;
	currentSession?: PomodoroSession;
	timeRemaining: number;
	nextSessionType?: "work" | "short-break" | "long-break";
}

export interface PomodoroSessionHistory {
	id: string;
	startTime: string;
	endTime: string;
	plannedDuration: number;
	type: "work" | "short-break" | "long-break";
	taskPath?: string;
	completed: boolean;
	activePeriods: PomodoroTimePeriod[];
}

export interface PomodoroHistoryStats {
	pomodorosCompleted: number;
	currentStreak: number;
	totalMinutes: number;
	averageSessionLength: number;
	completionRate: number;
}

// Field mapping naming aliases (see upstream comment for the three concepts)
export type FrontmatterPropertyName = string;
export type FieldMappingKey = keyof FieldMapping;
export type TaskCardPropertyId = string;

export interface FieldMapping {
	title: string;
	status: string;
	priority: string;
	due: string;
	scheduled: string;
	contexts: string;
	projects: string;
	timeEstimate: string;
	completedDate: string;
	dateCreated: string;
	dateModified: string;
	recurrence: string;
	recurrenceAnchor: string;
	archiveTag: string;
	timeEntries: string;
	completeInstances: string;
	skippedInstances: string;
	blockedBy: string;
	pomodoros: string;
	icsEventId: string;
	icsEventTag: string;
	googleCalendarEventId: string;
	googleCalendarExceptionEventId: string;
	googleCalendarExceptionOriginalScheduled: string;
	googleCalendarMovedOriginalDates: string;
	reminders: string;
	sortOrder: string;
}

export interface StatusConfig {
	id: string;
	value: string;
	label: string;
	color: string;
	icon?: string;
	isCompleted: boolean;
	excludeFromCycle?: boolean;
	nextStatus?: string;
	order: number;
	autoArchive: boolean;
	autoArchiveDelay: number;
}

export interface PriorityConfig {
	id: string;
	value: string;
	label: string;
	color: string;
	icon?: string;
	weight: number;
}

export interface Template {
	id: string;
	name: string;
	description: string;
	config: {
		fieldMapping: Partial<FieldMapping>;
		customStatuses: StatusConfig[];
		customPriorities: PriorityConfig[];
	};
}

export interface ExportedConfig {
	version: string;
	fieldMapping: FieldMapping;
	customStatuses: StatusConfig[];
	customPriorities: PriorityConfig[];
}

// Kanban board types
export type KanbanGroupByField = "status" | "priority" | "context";

export interface KanbanBoardConfig {
	id: string;
	name: string;
	groupByField: KanbanGroupByField;
	columnOrder: string[];
}

// UI state management for filter preferences
export interface ViewFilterState {
	[viewType: string]: FilterQuery;
}

// Calendar view preferences for Advanced Calendar
export interface CalendarViewPreferences {
	showScheduled: boolean;
	showDue: boolean;
	showTimeEntries: boolean;
	showRecurring: boolean;
	showICSEvents: boolean;
	showTimeblocks?: boolean;
	headerCollapsed?: boolean;
	showAllDaySlot?: boolean;
	showTimeGrid?: boolean;
}

// All view-specific preferences
export interface ViewPreferences {
	[viewType: string]: unknown;
}

// ICS Subscription types
export interface ICSSubscription {
	id: string;
	name: string;
	url?: string;
	filePath?: string;
	type: "remote" | "local";
	color: string;
	enabled: boolean;
	refreshInterval: number;
}

export interface ICSEvent {
	id: string;
	subscriptionId: string;
	title: string;
	description?: string;
	start: string;
	end?: string;
	allDay: boolean;
	location?: string;
	url?: string;
	rrule?: string;
	color?: string;
}

export interface ICSCache {
	subscriptionId: string;
	events: ICSEvent[];
	lastUpdated: string;
	expires: string;
}

// Webhook types
export type WebhookEvent =
	| "task.created"
	| "task.updated"
	| "task.deleted"
	| "task.completed"
	| "task.archived"
	| "task.unarchived"
	| "time.started"
	| "time.stopped"
	| "pomodoro.started"
	| "pomodoro.completed"
	| "pomodoro.interrupted"
	| "recurring.instance.completed"
	| "recurring.instance.skipped"
	| "reminder.triggered";

export interface WebhookConfig {
	id: string;
	url: string;
	events: WebhookEvent[];
	secret: string;
	active: boolean;
	createdAt: string;
	lastTriggered?: string;
	failureCount: number;
	successCount: number;
	transformFile?: string;
	corsHeaders?: boolean;
}

export interface WebhookPayload {
	event: WebhookEvent;
	timestamp: string;
	vault: { name: string; path?: string };
	data: unknown;
}

export interface WebhookDelivery {
	id: string;
	webhookId: string;
	event: WebhookEvent;
	payload: unknown;
	status: "pending" | "success" | "failed";
	attempts: number;
	lastAttempt?: string;
	responseStatus?: number;
	error?: string;
}

// Auto-archive types
export interface PendingAutoArchive {
	taskPath: string;
	statusChangeTimestamp: number;
	archiveAfterTimestamp: number;
	statusValue: string;
}

export interface PendingGoogleCalendarDeletion {
	taskPath: string;
	calendarId: string;
	eventId: string;
	createdAt: number;
	attempts: number;
	lastAttemptAt?: number;
	lastError?: string;
}

export interface GoogleCalendarEventIndexEntry {
	taskPath: string;
	calendarId: string;
	eventId: string;
	updatedAt: number;
}

export interface PendingGoogleCalendarSync {
	taskPath: string;
	requestedAt: number;
	attempts: number;
	lastAttemptAt?: number;
	lastError?: string;
}

export interface IWebhookNotifier {
	triggerWebhook(event: WebhookEvent, data: unknown): Promise<void>;
}

// OAuth types
export type OAuthProvider = "google" | "microsoft";

export interface OAuthTokens {
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
	scope: string;
	tokenType: string;
}

export interface OAuthConnection {
	provider: OAuthProvider;
	tokens: OAuthTokens;
	userEmail?: string;
	connectedAt: string;
	lastRefreshed?: string;
}

export interface OAuthConfig {
	provider: OAuthProvider;
	clientId: string;
	clientSecret?: string;
	redirectUri: string;
	scope: string[];
	authorizationEndpoint: string;
	tokenEndpoint: string;
	deviceCodeEndpoint?: string;
	revocationEndpoint?: string;
}

// Google Calendar types
export interface GoogleCalendarEvent {
	id: string;
	summary: string;
	description?: string;
	start: {
		dateTime?: string;
		date?: string;
		timeZone?: string;
	};
	end: {
		dateTime?: string;
		date?: string;
		timeZone?: string;
	};
	location?: string;
	attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>;
	htmlLink?: string;
	recurrence?: string[];
	colorId?: string;
	status?: string;
}

export interface GoogleCalendar {
	id: string;
	summary: string;
	description?: string;
	backgroundColor?: string;
	primary?: boolean;
}
