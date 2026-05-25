import { h } from 'preact';
import { useState } from 'preact/hooks';
import { ItemCard } from '../components/ItemCard';
import { QuestionBanner } from '../components/QuestionBanner';
import type { Item } from '../../vault/schema/item';

interface Props {
  item: Item;
  onSubmit: (attrs: { context: string; energy: 'low' | 'medium' | 'high'; time: number }) => void;
}

const CONTEXTS = ['@home', '@computer', '@phone', '@errands', '@anywhere'];

export const NextActionAttrs = ({ item, onSubmit }: Props) => {
  const [context, setContext] = useState('');
  const [energy, setEnergy]   = useState<'low' | 'medium' | 'high'>('medium');
  const [time, setTime]       = useState(15);

  return (
    <div class="clarify-screen">
      <QuestionBanner text="Context, energy, time" />
      <ItemCard item={item} compact />
      <div class="clarify-row">
        <label>Context</label>
        <div class="clarify-chips">
          {CONTEXTS.map((c) => (
            <span class={`clarify-chip ${context === c ? 'active' : ''}`} onClick={() => setContext(c)}>{c}</span>
          ))}
        </div>
      </div>
      <div class="clarify-row">
        <label>Energy</label>
        <div class="clarify-chips">
          {(['low','medium','high'] as const).map((e) => (
            <span class={`clarify-chip ${energy === e ? 'active' : ''}`} onClick={() => setEnergy(e)}>{e}</span>
          ))}
        </div>
      </div>
      <div class="clarify-row">
        <label>Time (min)</label>
        <input type="number" value={time} min={1} onInput={(e) => setTime(Number((e.target as HTMLInputElement).value))} />
      </div>
      <button class="clarify-submit" disabled={!context} onClick={() => onSubmit({ context, energy, time })}>Continue</button>
    </div>
  );
};
