import type { Item } from '../vault/schema/item';
import type { Outcome } from '../vault/schema/outcome';

export interface ItemMachineInput {
  item: Item;
}

export interface ItemMachineContext {
  item: Item;
  draft: Partial<Outcome> & { type?: Outcome['type'] };
  path: Array<{ stateValue: unknown; draftSnapshot: ItemMachineContext['draft'] }>;
}

export type ItemEvent =
  | { type: 'YES' }
  | { type: 'NO' }
  | { type: 'PICK'; outcome: string }
  | { type: 'INPUT'; field: string; value: unknown }
  | { type: 'BACK' }
  | { type: 'EXIT' }
  | { type: 'SUBMIT' };
