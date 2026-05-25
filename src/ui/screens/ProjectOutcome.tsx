import { h } from 'preact';
import { useState } from 'preact/hooks';
import { ItemCard } from '../components/ItemCard';
import { QuestionBanner } from '../components/QuestionBanner';
import type { Item } from '../../vault/schema/item';

interface Props {
  item: Item;
  onSubmit: (outcome: string, firstAction: string) => void;
}

export const ProjectOutcome = ({ item, onSubmit }: Props) => {
  const [outcome, setOutcome]         = useState('');
  const [firstAction, setFirstAction] = useState(item.title);
  return (
    <div class="clarify-screen">
      <QuestionBanner text="Define the project" />
      <ItemCard item={item} compact />
      <div class="clarify-row">
        <label>Outcome (what success looks like)</label>
        <input class="clarify-text-input" value={outcome} onInput={(e) => setOutcome((e.target as HTMLInputElement).value)} />
      </div>
      <div class="clarify-row">
        <label>First next action</label>
        <input class="clarify-text-input" value={firstAction} onInput={(e) => setFirstAction((e.target as HTMLInputElement).value)} />
      </div>
      <button class="clarify-submit" disabled={!outcome.trim() || !firstAction.trim()} onClick={() => onSubmit(outcome.trim(), firstAction.trim())}>Continue</button>
    </div>
  );
};
