import type { Item } from '../../vault/schema/item';

export const ItemCard = ({ item, compact = false }: { item: Item; compact?: boolean }) => (
  <div class={`clarify-item-card ${compact ? 'compact' : ''}`}>
    <div class="text">{item.title}</div>
    {!compact && <div class="meta">{item.path}</div>}
  </div>
);
