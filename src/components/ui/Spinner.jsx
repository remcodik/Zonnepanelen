export default function Spinner({ size = 32 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", border: `2px solid var(--border-2)`, borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} />
  );
}
