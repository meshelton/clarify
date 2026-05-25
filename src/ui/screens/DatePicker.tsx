import { h } from 'preact';
import { useState } from 'preact/hooks';
import { ItemCard } from '../components/ItemCard';
import { QuestionBanner } from '../components/QuestionBanner';
import type { Item } from '../../vault/schema/item';

const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

interface Props {
  item: Item;
  question: string;
  onSubmit: (date: string) => void;
}

export const DatePicker = ({ item, question, onSubmit }: Props) => {
  const [date, setDate] = useState('');
  return (
    <div class="clarify-screen">
      <QuestionBanner text={question} />
      <ItemCard item={item} compact />
      <div class="clarify-date-presets">
        <button onClick={() => setDate(addDays(1))}>Tomorrow</button>
        <button onClick={() => setDate(addDays(7))}>+1 week</button>
        <button onClick={() => setDate(addDays(30))}>+1 month</button>
      </div>
      <input type="date" value={date} onChange={(e) => setDate((e.target as HTMLInputElement).value)} />
      <button class="clarify-submit" disabled={!date} onClick={() => onSubmit(date)}>Continue</button>
    </div>
  );
};
