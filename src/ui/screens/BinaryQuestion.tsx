import { h } from 'preact';
import { ItemCard } from '../components/ItemCard';
import { QuestionBanner } from '../components/QuestionBanner';
import { KeyHint } from '../components/KeyHint';
import type { Item } from '../../vault/schema/item';

interface Props {
  item: Item;
  question: string;
  yesLabel?: string;
  noLabel?: string;
  onYes: () => void;
  onNo: () => void;
}

export const BinaryQuestion = ({ item, question, yesLabel = 'Yes', noLabel = 'No', onYes, onNo }: Props) => (
  <div class="clarify-screen">
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
