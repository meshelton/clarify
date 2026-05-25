import { Schema } from 'effect';

const ProjectLink = Schema.String; // wiki-link form: "[[Project Name]]"

export const TrashOutcome      = Schema.Struct({ type: Schema.Literal('trash') });
export const SomedayOutcome    = Schema.Struct({ type: Schema.Literal('someday'),    projectLink: ProjectLink });
export const TicklerOutcome    = Schema.Struct({ type: Schema.Literal('tickler'),    projectLink: ProjectLink, tickleDate: Schema.String });
export const ReferenceOutcome  = Schema.Struct({ type: Schema.Literal('reference') });
export const ProjectOutcome    = Schema.Struct({ type: Schema.Literal('project'),    outcome: Schema.String, firstActionText: Schema.String, areaLink: ProjectLink });
export const DoNowOutcome      = Schema.Struct({ type: Schema.Literal('doNow'),      projectLink: ProjectLink });
export const WaitingForOutcome = Schema.Struct({ type: Schema.Literal('waitingFor'), projectLink: ProjectLink, who: Schema.String, followUp: Schema.String });
export const CalendarOutcome   = Schema.Struct({ type: Schema.Literal('calendar'),   projectLink: ProjectLink, date: Schema.String });
export const NextActionOutcome = Schema.Struct({
  type: Schema.Literal('nextAction'),
  projectLink: ProjectLink,
  context: Schema.String,
  energy: Schema.Union(Schema.Literal('low'), Schema.Literal('medium'), Schema.Literal('high')),
  time: Schema.Number,
});

export const Outcome = Schema.Union(
  TrashOutcome, SomedayOutcome, TicklerOutcome, ReferenceOutcome,
  ProjectOutcome, DoNowOutcome, WaitingForOutcome, CalendarOutcome, NextActionOutcome,
);

export type Outcome = Schema.Schema.Type<typeof Outcome>;
