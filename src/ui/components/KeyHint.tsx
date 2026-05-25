export const KeyHint = ({ keys }: { keys: string[] }) => (
  <span class="clarify-key-hint">{keys.map((k) => <kbd>{k}</kbd>)}</span>
);
