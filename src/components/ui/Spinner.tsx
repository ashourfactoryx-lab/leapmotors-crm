export function Spinner({ size = 22 }: { size?: number }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className="inline-block animate-spin rounded-full border-[2.5px] border-accent-soft border-t-accent"
      style={{ width: size, height: size }}
    />
  );
}
