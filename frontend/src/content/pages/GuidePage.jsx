import ContentLayout from "../components/ContentLayout.jsx";
import Toc from "../components/Toc.jsx";
import { tocFromHeadings } from "../lib/loadEntries.js";

// One shared template for every guide-shaped entry (guides, cloud-architecture,
// claude-architecture) -- these used to be 22 separate hand-written JSX pages;
// now they're markdown files under src/content/entries/, and this is the only
// component that renders them. `entry.html` is build-time-generated from
// markdown this team writes, not runtime/user input, so dangerouslySetInnerHTML
// here carries none of the XSS risk that name usually implies.
export function guideMeta(entry, section) {
  return {
    outFile: `${section}/${entry.slug}.html`,
    title: `${entry.title} — Merit AC Guides`,
    description: entry.description,
  };
}

export default function GuidePage({ entry, section }) {
  const toc = tocFromHeadings(entry.headings);
  return (
    <ContentLayout active={section} wide={entry.wide}>
      <span className="kicker">{entry.kicker}</span>
      {entry.badge && (
        <span className="badge">
          <i /> {entry.badge}
        </span>
      )}
      <h1>{entry.title}</h1>
      <p className="lead">{entry.lead || entry.description}</p>
      {toc.length > 0 && <Toc items={toc} />}
      <div dangerouslySetInnerHTML={{ __html: entry.html }} />
    </ContentLayout>
  );
}
