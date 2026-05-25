import { h } from 'preact';
import { useRef } from 'preact/hooks';
import { ItemCard } from '../components/ItemCard';
import { QuestionBanner } from '../components/QuestionBanner';
import { KeyHint } from '../components/KeyHint';
import { useKeybindings } from '../hooks/useKeybindings';
import { useSwipe } from '../hooks/useSwipe';
import type { Item } from '../../vault/schema/item';
import type { ClarifySettings } from '../../settings/schema';

interface Props {
  item: Item;
  question: string;
  yesLabel?: string;
  noLabel?: string;
  onYes: () => void;
  onNo: () => void;
  settings?: ClarifySettings;
}

export const BinaryQuestion = ({ item, question, yesLabel = 'Yes', noLabel = 'No', onYes, onNo, settings }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  useKeybindings(settings, { YES: onYes, NO: onNo });
  useSwipe(ref, { onSwipeLeft: onNo, onSwipeRight: onYes });
  return (
    <div class="clarify-screen" ref={ref}>
      <QuestionBanner text={question} />
      <ItemCard item={item} />
      <div class="clarify-kbd-row">
        <div class="clarify-kbd-opt" onClick={onYes}>
          <KeyHint keys={['Y']} /> <div>{yesLabel}</div>
        </div>
        <div class="clarify-kbd-opt" onClick={onNo}>
          <KeyHint keys={['N']} /> <div>{noLabel}</div>
        </div>
      </div>
      <div class="clarify-button-row">
        <div class="btn no" onClick={onNo}>{noLabel}</div>
        <div class="btn yes" onClick={onYes}>{yesLabel}</div>
      </div>
    </div>
  );
};
