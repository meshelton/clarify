import { Schema } from 'effect';

export const ItemFrontmatter = Schema.Struct({
  status: Schema.optional(Schema.String),
  tags: Schema.optional(Schema.Array(Schema.String)),
  scheduled: Schema.optional(Schema.String),
  due: Schema.optional(Schema.String),
  priority: Schema.optional(Schema.String),
  project: Schema.optional(Schema.String),
});

export const Item = Schema.Struct({
  path: Schema.String,
  title: Schema.String,
  body: Schema.String,
  frontmatter: ItemFrontmatter,
  capturedAt: Schema.optional(Schema.String),
});

export type Item = Schema.Schema.Type<typeof Item>;
export type ItemFrontmatter = Schema.Schema.Type<typeof ItemFrontmatter>;
