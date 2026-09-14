// Pulls new posts from a personal newsletter's RSS/Atom feed into
// frontend/src/content/entries/newsletter/ as plain markdown files, in the
// exact shape loadEntries.js already expects (see src/content/lib/loadEntries.js)
// -- so a newsletter post shows up on the site the same way a hand-written
// guide or a news article does, no other file needs to change once this has
// run.
//
// Configured entirely via MERIT_NEWSLETTER_RSS_URL. Unset -> this script is a
// silent no-op, so a fresh checkout without a feed configured still builds
// cleanly (the newsletter section just renders empty, same as /news does
// before its first article). Set it to your feed's URL --
// Substack/Beehiiv/ConvertKit/Ghost all publish one, usually at /feed or
// /rss.xml on your newsletter's own domain.
//
// Idempotent and additive only: an item already present on disk (matched by
// slug) is left untouched, so editing a synced post by hand sticks across
// reruns. Nothing here ever deletes a file -- if a post is pulled from the
// feed upstream, its local copy stays until someone removes it on purpose.
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Parser from "rss-parser";
import { isSafeUrl } from "../src/content/lib/loadEntries.js";

const FEED_URL = process.env.MERIT_NEWSLETTER_RSS_URL;
const ENTRIES_DIR = join(process.cwd(), "src/content/entries/newsletter");

function slugify(title, fallback) {
  const slug = (title || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || fallback;
}

// YAML frontmatter -- escape the one character that would otherwise break a
// single-quoted scalar (a literal `'` doubles to `''` in YAML, same as SQL).
function yamlQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
  if (!FEED_URL) {
    console.log("sync-newsletter: MERIT_NEWSLETTER_RSS_URL not set, skipping.");
    return;
  }

  mkdirSync(ENTRIES_DIR, { recursive: true });
  const existingSlugs = new Set(
    existsSync(ENTRIES_DIR)
      ? readdirSync(ENTRIES_DIR)
          .filter((f) => f.endsWith(".md"))
          .map((f) => f.replace(/\.md$/, ""))
      : []
  );

  const parser = new Parser();
  let feed;
  try {
    feed = await parser.parseURL(FEED_URL);
  } catch (err) {
    // A build should never hard-fail because an external feed hiccuped --
    // the site still has everything it already synced on previous runs.
    console.error(`sync-newsletter: couldn't fetch or parse ${FEED_URL}: ${err.message}`);
    return;
  }

  let added = 0;
  for (const [i, item] of (feed.items ?? []).entries()) {
    if (!item.link || !isSafeUrl(item.link)) continue; // feed content is untrusted external input
    const fallbackSlug = `newsletter-post-${i}`;
    const slug = slugify(item.title, fallbackSlug);
    if (existingSlugs.has(slug)) continue;

    const date = item.isoDate || item.pubDate || new Date().toISOString();
    const dek = (item.contentSnippet || "").trim().replace(/\s+/g, " ").slice(0, 280);

    const frontmatter = [
      "---",
      `title: ${yamlQuote(item.title || "Untitled post")}`,
      `date: ${yamlQuote(date.slice(0, 10))}`,
      `link: ${yamlQuote(item.link)}`,
      dek ? `dek: ${yamlQuote(dek)}` : null,
      "---",
    ]
      .filter(Boolean)
      .join("\n");

    // Body is deliberately just the dek/excerpt again, not the feed's full
    // content -- the article itself lives on the newsletter platform; this
    // site links out to it (see NewsletterEntry.jsx) rather than
    // republishing it in full, which avoids a duplicate, possibly-stale copy
    // of something the platform is already the canonical source for.
    const body = dek || "Read the full post at the link above.";

    writeFileSync(join(ENTRIES_DIR, `${slug}.md`), `${frontmatter}\n\n${body}\n`);
    existingSlugs.add(slug);
    added++;
  }

  console.log(`sync-newsletter: ${added} new post(s) added, ${existingSlugs.size} total.`);
}

await main();
