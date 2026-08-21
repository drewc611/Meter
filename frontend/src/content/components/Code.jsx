// A code sample inside a .card, matching the look every setup guide uses.
export default function Code({ children }) {
  return (
    <div className="card">
      <pre>
        <code>{children}</code>
      </pre>
    </div>
  );
}
