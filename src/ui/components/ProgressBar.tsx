export const ProgressBar = ({ current, total }: { current: number; total: number }) => {
  const pct = total === 0 ? 0 : Math.round(((current + 1) / total) * 100);
  return (
    <div class="clarify-progress">
      <div style={`width: ${pct}%`} />
    </div>
  );
};
