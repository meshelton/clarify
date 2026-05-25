import { h } from 'preact';

interface Props {
  total: number;
  errors: Array<{ itemPath: string; error: unknown }>;
  onClose: () => void;
}

export const SessionComplete = ({ total, errors, onClose }: Props) => (
  <div class="clarify-screen complete">
    <h2>Inbox cleared</h2>
    <p>{total - errors.length} of {total} items processed.</p>
    {errors.length > 0 && (
      <div class="clarify-errors">
        <h3>{errors.length} item(s) couldn't be written:</h3>
        <ul>
          {errors.map((e) => <li>{e.itemPath} — {String(e.error)}</li>)}
        </ul>
      </div>
    )}
    <button class="clarify-submit" onClick={onClose}>Close</button>
  </div>
);
