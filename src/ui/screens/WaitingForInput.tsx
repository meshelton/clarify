import { h } from 'preact';
import { useState } from 'preact/hooks';
import { ItemCard } from '../components/ItemCard';
import { QuestionBanner } from '../components/QuestionBanner';
import type { Item } from '../../vault/schema/item';

interface Props {
  item: Item;
  onSubmit: (who: string) => void;
}

export const WaitingForInput = ({ item, onSubmit }: Props) => {
  const [who, setWho] = useState('');
  return (
    <div class="clarify-screen">
      <QuestionBanner text="Who are you waiting on?" />
      <ItemCard item={item} compact />
      <input
        class="clarify-text-input"
        placeholder="Name / role / team"
        value={who}
        onInput={(e) => setWho((e.target as HTMLInputElement).value)}
      />
      <button class="clarify-submit" disabled={!who.trim()} onClick={() => onSubmit(who.trim())}>Continue</button>
    </div>
  );
};
