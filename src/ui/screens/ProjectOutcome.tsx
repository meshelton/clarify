import { h } from 'preact';
import { useState } from 'preact/hooks';
import { ItemCard } from '../components/ItemCard';
import { QuestionBanner } from '../components/QuestionBanner';
import type { Item } from '../../vault/schema/item';

interface Props {
  item: Item;
  onSubmit: (outcome: string) => void;
}

export const ProjectOutcome = ({ item, onSubmit }: Props) => {
  const [outcome, setOutcome] = useState('');
  return (
    <div class="clarify-screen">
      <QuestionBanner text="Define the project" />
      <ItemCard item={item} compact />
      <div class="clarify-row">
        <label>Outcome (what success looks like)</label>
        <input class="clarify-text-input" value={outcome} onInput={(e) => setOutcome((e.target as HTMLInputElement).value)} />
      </div>
      <button class="clarify-submit" disabled={!outcome.trim()} onClick={() => onSubmit(outcome.trim())}>Continue</button>
    </div>
  );
};
