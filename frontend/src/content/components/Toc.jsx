export default function Toc({ items }) {
  return (
    <nav className="toc" aria-label="On this page">
      <span className="toc-label">On this page</span>
      <ol>
        {items.map((item) => (
          <li key={item.href}>
            <a href={item.href}>{item.label}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
