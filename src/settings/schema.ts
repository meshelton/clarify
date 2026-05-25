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
    trash:      Schema.Struct({ folder: Schema.String }),
    someday:    Schema.Struct({ folder: Schema.String, statusValue: Schema.String, tagsAdd: StringList, tagsRemove: StringList }),
    tickler:    Schema.Struct({ folder: Schema.String, statusValue: Schema.String, tagsAdd: StringList, tagsRemove: StringList }),
    reference:  Schema.Struct({ folder: Schema.String, tagsAdd: StringList, tagsRemove: StringList, fieldsRemove: StringList }),
    project:    Schema.Struct({ folder: Schema.String, statusValue: Schema.String, tagsAdd: StringList, tagsRemove: StringList, outcomeField: Schema.String }),
    doNow:      Schema.Struct({ statusValue: Schema.String, completedDateField: Schema.String }),
    waitingFor: Schema.Struct({ folder: Schema.String, statusValue: Schema.String, tagsAdd: StringList, whoField: Schema.String, followUpField: Schema.String }),
    calendar:   Schema.Struct({ statusValue: Schema.String, dateField: Schema.String }),
    nextAction: Schema.Struct({ folder: Schema.NullOr(Schema.String), statusValue: Schema.String, contextField: Schema.String, energyField: Schema.String, timeField: Schema.String }),
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
    someday:    { folder: 'Someday',  statusValue: 'someday',   tagsAdd: ['someday'],   tagsRemove: ['task'] },
    tickler:    { folder: 'Tickler',  statusValue: 'tickler',   tagsAdd: ['tickler'],   tagsRemove: ['task'] },
    reference:  { folder: 'Resources', tagsAdd: ['reference'], tagsRemove: ['task'], fieldsRemove: ['status','priority','scheduled','due'] },
    project:    { folder: 'Projects', statusValue: 'active',    tagsAdd: ['project'],   tagsRemove: ['task'], outcomeField: 'outcome' },
    doNow:      { statusValue: 'done', completedDateField: 'completedDate' },
    waitingFor: { folder: 'Waiting',  statusValue: 'waiting',   tagsAdd: ['waiting'],   whoField: 'waitingFor', followUpField: 'scheduled' },
    calendar:   { statusValue: 'scheduled', dateField: 'scheduled' },
    nextAction: { folder: 'Next', statusValue: 'next', contextField: 'contexts', energyField: 'energy', timeField: 'time' },
  },
  projectsAndAreas: {
    projectsFolder: 'Projects',
    areasFolder: 'Areas',
    miscAreaName: 'Misc',
    projectLinkField: 'project',
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
