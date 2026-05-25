import { Data } from 'effect';

export class InboxReadError extends Data.TaggedError('InboxReadError')<{
  cause: unknown;
}> {}

export class FrontmatterParseError extends Data.TaggedError('FrontmatterParseError')<{
  path: string;
  reason: string;
}> {}

export class OutcomeWriteError extends Data.TaggedError('OutcomeWriteError')<{
  itemPath: string;
  outcomeType: string;
  cause: unknown;
}> {}

export class ProjectNotFoundError extends Data.TaggedError('ProjectNotFoundError')<{
  name: string;
}> {}

export class FileNotFound extends Data.TaggedError('FileNotFound')<{
  path: string;
}> {}
