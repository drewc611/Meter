import ContentLayout from "../components/ContentLayout.jsx";
import Code from "../components/Code.jsx";
import { PROMPTS } from "../data/prompts.js";

export function promptMeta(entry) {
  return {
    outFile: `prompts/day-${entry.day}-${entry.slug}.html`,
    title: `Day ${entry.day}: ${entry.title} — Merit AC Prompts`,
    description: entry.prompt.slice(0, 155),
  };
}

export default function PromptDay({ entry }) {
  const prev = PROMPTS.find((p) => p.day === entry.day - 1);
  const next = PROMPTS.find((p) => p.day === entry.day + 1);
  return (
    <ContentLayout active="prompts">
      <span className="kicker">{entry.track}</span>
      <span className="badge">
        <i /> Day {entry.day} of 30
      </span>
      <h1>{entry.title}</h1>

      <h2>The prompt</h2>
      <Code>{entry.prompt}</Code>

      <h2>Why it's built that way</h2>
      <p>{entry.why}</p>

      <h2>What to do with the answer</h2>
      <p>{entry.whatToDo}</p>

      {entry.day === 30 && (
        <p>
          That's the full 30 days. If you want a second set of eyes on the result,{" "}
          <a href="/challenge#paid-track">Andrew Clark offers a paid review</a> of finished
          builds against the challenge's Definition of Done.
        </p>
      )}

      <div className="cta-row">
        {prev && (
          <a className="btn btn-secondary" href={`/prompts/day-${prev.day}-${prev.slug}`}>
            ← Day {prev.day}
          </a>
        )}
        <a className="btn btn-secondary" href="/prompts">
          All 30 days
        </a>
        {next && (
          <a className="btn btn-primary" href={`/prompts/day-${next.day}-${next.slug}`}>
            Day {next.day} →
          </a>
        )}
      </div>
    </ContentLayout>
  );
}
