import { h } from 'preact';
import { ItemCard } from '../components/ItemCard';
import { QuestionBanner } from '../components/QuestionBanner';
import { KeyHint } from '../components/KeyHint';
import type { Item } from '../../vault/schema/item';

export interface OptionDef {
  key: string;       // for keyboard ('1'..'4')
  outcome: string;   // dispatch value
  icon: string;      // emoji
  label: string;
  description: string;
}

interface Props {
  item: Item;
  question: string;
  options: OptionDef[];
  onPick: (outcome: string) => void;
}

export const MultiOption = ({ item, question, options, onPick }: Props) => (
  <div class="clarify-screen">
    <QuestionBanner text={question} />
    <ItemCard item={item} compact />
    <div class="clarify-kbd-grid">
      {options.map((o) => (
        <div class="opt" onClick={() => onPick(o.outcome)}>
          <KeyHint keys={[o.key]} />
          <div class="icon">{o.icon}</div>
          <div>
            <div class="label">{o.label}</div>
            <div class="desc">{o.description}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
