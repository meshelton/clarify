import { h } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { ItemCard } from '../components/ItemCard';
import { QuestionBanner } from '../components/QuestionBanner';
import type { Item } from '../../vault/schema/item';
import type { ProjectRef } from '../../vault/services/ProjectService';

interface Props {
  item: Item;
  question?: string;
  options: ProjectRef[];
  onPick: (link: string) => void;
  onCreateProject?: (name: string) => void;
}

export const ProjectPicker = ({ item, question = 'Which project or area?', options, onPick, onCreateProject }: Props) => {
  const [filter, setFilter] = useState('');
  const filtered = useMemo(
    () => options.filter((o) => o.name.toLowerCase().includes(filter.toLowerCase())),
    [filter, options]
  );
  return (
    <div class="clarify-screen">
      <QuestionBanner text={question} />
      <ItemCard item={item} compact />
      <input
        class="clarify-project-filter"
        type="text"
        placeholder="Filter projects/areas…"
        value={filter}
        onInput={(e) => setFilter((e.target as HTMLInputElement).value)}
      />
      <div class="clarify-project-list">
        {filtered.map((o) => (
          <div class="clarify-project-row" onClick={() => onPick(o.link)}>
            <span class="kind">{o.kind === 'project' ? '🎯' : '🌳'}</span>
            <span>{o.name}</span>
          </div>
        ))}
        {filter && onCreateProject && (
          <div class="clarify-project-row create" onClick={() => onCreateProject(filter)}>
            + Create new project: {filter}
          </div>
        )}
      </div>
    </div>
  );
};
