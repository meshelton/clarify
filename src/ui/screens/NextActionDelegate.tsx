import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { App } from 'obsidian';
import { ItemCard } from '../components/ItemCard';
import { QuestionBanner } from '../components/QuestionBanner';
import type { Item } from '../../vault/schema/item';
import { getTaskNotesAdapter, type TaskInfo } from '../../integrations/tasknotes';

interface Props {
  app: App;
  item: Item;
  /** Called once TaskNotes has finished editing (or the user opted out). */
  onDone: () => void;
}

export const NextActionDelegate = ({ app, item, onDone }: Props) => {
  const [opened, setOpened] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const openTaskNotes = async () => {
    const adapter = getTaskNotesAdapter(app);
    if (!adapter) {
      setError('TaskNotes API not available.');
      return;
    }
    try {
      const taskInfo = await adapter.getTaskInfo(item.path);
      if (!taskInfo) {
        setError('TaskNotes could not load this file as a task.');
        return;
      }
      setOpened(true);
      adapter.openEditModal(taskInfo, (updated: TaskInfo) => {
        // TaskNotes may move the file based on its own folder/template settings.
        // Mutate the Item in place so the queue (which sessionMachine reads on
        // applyOutcome) picks up the new path. The Item is the same JS object
        // sessionMachine holds in its queue, so this mutation is the cheapest
        // way to forward the new path through to apply without restructuring
        // the state machine's output shape. The narrow cast is the deliberate
        // escape hatch — Effect Schema marks `path` readonly but the actual
        // JS object is mutable.
        if (updated?.path && updated.path !== item.path) {
          (item as { path: string }).path = updated.path;
        }
        onDone();
      });
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
