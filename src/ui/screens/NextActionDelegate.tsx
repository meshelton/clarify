import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { App } from 'obsidian';
import { ItemCard } from '../components/ItemCard';
import { QuestionBanner } from '../components/QuestionBanner';
import type { Item } from '../../vault/schema/item';

interface Props {
  app: App;
  item: Item;
  onDone: () => void;
}

// Minimal shape we need from the TaskNotes plugin instance.
interface TaskNotesLike {
  cacheManager?: { getTaskInfo: (file: unknown) => Promise<unknown> };
  openTaskEditModal?: (task: unknown, onTaskUpdated?: () => void) => void;
}

export const NextActionDelegate = ({ app, item, onDone }: Props) => {
  const [opened, setOpened] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const openTaskNotes = async () => {
    const tn = ((app as unknown as { plugins?: { plugins?: Record<string, TaskNotesLike> } })
      .plugins?.plugins?.tasknotes);
    if (!tn?.openTaskEditModal || !tn.cacheManager?.getTaskInfo) {
      setError('TaskNotes API not available.');
      return;
    }
    try {
      const file = app.vault.getAbstractFileByPath(item.path);
      if (!file) { setError(`File not found: ${item.path}`); return; }
      const taskInfo = await tn.cacheManager.getTaskInfo(file);
      if (!taskInfo) { setError('TaskNotes could not load this file as a task.'); return; }
      setOpened(true);
      tn.openTaskEditModal(taskInfo, () => onDone());
    } catch (e) {
      setError(String(e));
    }
  };

  // Auto-open the TaskNotes modal as soon as the user lands on this screen.
  useEffect(() => { void openTaskNotes(); }, []);

  return (
    <div class="clarify-screen">
      <QuestionBanner text="Set attributes in TaskNotes" />
      <ItemCard item={item} compact />
      <div class="clarify-row">
        {!opened && !error && <p>Opening TaskNotes editor…</p>}
        {opened && <p>Save in TaskNotes to continue. If you canceled, click below.</p>}
        {error && <p class="clarify-error">{error}</p>}
        <div style="display:flex; gap:8px;">
          <button class="clarify-submit" onClick={() => void openTaskNotes()}>Reopen TaskNotes</button>
          <button class="clarify-submit" onClick={onDone}>Continue without TaskNotes</button>
        </div>
      </div>
    </div>
  );
};
