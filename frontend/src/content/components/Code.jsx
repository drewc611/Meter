// A code sample inside a .card, matching the look every setup guide uses.
// Pass `wrap` for prose that happens to be styled as code (a natural-
// language prompt, not indentation-sensitive code) so long lines wrap
// instead of requiring horizontal scroll to read.
export default function Code({ children, wrap }) {
  return (
    <div className="card">
      <pre className={wrap ? "pre-wrap" : undefined}>
        <code>{children}</code>
      </pre>
    </div>
  );
}
