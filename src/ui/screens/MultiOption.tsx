import { h } from 'preact';
import { ItemCard } from '../components/ItemCard';
import { QuestionBanner } from '../components/QuestionBanner';
import { KeyHint } from '../components/KeyHint';
import { useKeybindings } from '../hooks/useKeybindings';
import type { Item } from '../../vault/schema/item';
import type { ClarifySettings } from '../../settings/schema';

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
  settings?: ClarifySettings;
}

export const MultiOption = ({ item, question, options, onPick, settings }: Props) => {
  useKeybindings(settings, {
    PICK_1: () => options[0] && onPick(options[0].outcome),
    PICK_2: () => options[1] && onPick(options[1].outcome),
    PICK_3: () => options[2] && onPick(options[2].outcome),
    PICK_4: () => options[3] && onPick(options[3].outcome),
  });
  return (
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
};
