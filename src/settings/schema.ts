import { Schema } from 'effect';

const StringList = Schema.Array(Schema.String);

export const KeyBinding = Schema.Struct({
  key: Schema.String,
  modifiers: Schema.optional(StringList),
});

export const ClarifySettings = Schema.Struct({
  inbox: Schema.Struct({
    folderPath: Schema.NullOr(Schema.String),
    capturedStatusValue: Schema.NullOr(Schema.String),
    statusFieldName: Schema.String,
  }),
  outcomes: Schema.Struct({
    // Folder fields kept only for outcomes where the destination is NOT
    // resolved from a project/area binding: Trash, Reference, and the new
    // project note created by the Project outcome. Action-type outcomes
    // (someday/tickler/doNow/waitingFor/calendar/nextAction) resolve their
    // destination via resolveDestinationFolder against the bound project/area.
    trash:      Schema.Struct({ folder: Schema.String }),
    someday:    Schema.Struct({ statusValue: Schema.String, tagsAdd: StringList, tagsRemove: StringList }),
    tickler:    Schema.Struct({ statusValue: Schema.String, tagsAdd: StringList, tagsRemove: StringList }),
    reference:  Schema.Struct({ folder: Schema.String, tagsAdd: StringList, tagsRemove: StringList, fieldsRemove: StringList }),
    project:    Schema.Struct({ statusValue: Schema.String, tagsAdd: StringList, tagsRemove: StringList }),
    doNow:      Schema.Struct({ statusValue: Schema.String, completedDateField: Schema.String }),
    waitingFor: Schema.Struct({ statusValue: Schema.String, tagsAdd: StringList, whoField: Schema.String, followUpField: Schema.String }),
    calendar:   Schema.Struct({ statusValue: Schema.String, dateField: Schema.String }),
    nextAction: Schema.Struct({ statusValue: Schema.String, contextField: Schema.String, energyField: Schema.String, timeField: Schema.String }),
  }),
  projectsAndAreas: Schema.Struct({
    projectsFolder: Schema.String,
    areasFolder: Schema.String,
    miscAreaName: Schema.String,
    projectLinkField: Schema.String,
  }),
  keybindings: Schema.Record({ key: Schema.String, value: KeyBinding }),
  launch: Schema.Struct({
    showRibbonIcon: Schema.Boolean,
    commandPaletteEnabled: Schema.Boolean,
  }),
});

export type ClarifySettings = Schema.Schema.Type<typeof ClarifySettings>;

export const defaultSettings: ClarifySettings = {
  inbox: {
    folderPath: '00 Inbox',
    capturedStatusValue: 'captured',
    statusFieldName: 'status',
  },
  outcomes: {
    trash:      { folder: '.trash' },
    someday:    { statusValue: 'someday',   tagsAdd: ['someday'],   tagsRemove: ['task'] },
    tickler:    { statusValue: 'tickler',   tagsAdd: ['tickler'],   tagsRemove: ['task'] },
    reference:  { folder: 'Resources', tagsAdd: ['reference'], tagsRemove: ['task'], fieldsRemove: ['status','priority','scheduled','due'] },
    project:    { statusValue: 'active', tagsAdd: ['project'], tagsRemove: ['task'] },
    doNow:      { statusValue: 'done', completedDateField: 'completedDate' },
    waitingFor: { statusValue: 'waiting', tagsAdd: ['waiting'], whoField: 'waitingFor', followUpField: 'scheduled' },
    calendar:   { statusValue: 'scheduled', dateField: 'scheduled' },
    nextAction: { statusValue: 'next', contextField: 'contexts', energyField: 'energy', timeField: 'timeEstimate' },
  },
  projectsAndAreas: {
    projectsFolder: 'Projects',
    areasFolder: 'Areas',
    miscAreaName: 'Misc',
    projectLinkField: 'projects',
  },
  keybindings: {
    YES:  { key: 'y' },
    NO:   { key: 'n' },
    PICK_1: { key: '1' },
    PICK_2: { key: '2' },
    PICK_3: { key: '3' },
    PICK_4: { key: '4' },
    BACK: { key: 'ArrowLeft' },
    EXIT: { key: 'Escape' },
    HELP: { key: '?' },
  },
  launch: { showRibbonIcon: true, commandPaletteEnabled: true },
};
