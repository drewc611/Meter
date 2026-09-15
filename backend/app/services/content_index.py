"""
Mirrors the frontend's own markdown content
(frontend/src/content/entries/<type>/*.md) into ContentEntry rows, and does
simple keyword search over them for services/assistant.py.

Deliberately not SQLite FTS5 -- database.py's own convention is vanilla
SQLAlchemy portable to Postgres (see its module docstring), so search()
below scores matches in one bulk query plus pure-Python ranking instead,
the same "bulk queries, not per-row" shape services/scoring.py already
uses. Content volume here (low hundreds of entries) is comfortably small
enough for that to be the actually-simpler approach, not a shortcut taken
under pressure -- revisit only if that stops being true.
"""

import math
import re
from pathlib import Path

import yaml
from sqlalchemy.orm import Session

from ..models import ContentEntry
from ..time_utils import utcnow

# content type -> URL template. Keys match the folder names under
# frontend/src/content/entries/ exactly, so a new content type there needs
# one new line here and nothing else. Deliberate scope boundary: this only
# covers the markdown-driven content types -- hand-written JSX pages (Home,
# Architecture, Challenge, Community, OperatorOS, the venture spotlights,
# the setup guides) aren't here, so the assistant can't answer questions
# about them yet. Extending it to those would mean extracting their static
# text some other way (they're plain React components, not markdown), which
# is real follow-up work, not something to fake by hardcoding excerpts here.
CONTENT_TYPES = {
    "news": "/news/{slug}",
    "newsletter": "/newsletter/{slug}",
    "models": "/models/{slug}",
    "glossary": "/glossary#{slug}",
    "guides": "/guides/{slug}",
    "cloud-architecture": "/cloud-architecture/{slug}",
    "claude-architecture": "/claude-architecture/{slug}",
    "skills": "/skills/{slug}",
}

_FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n?(.*)$", re.DOTALL)
_WORD_RE = re.compile(r"[a-z0-9]+")

# The assistant's real queries are full questions ("what is a hallucination"),
# not keyword search -- without filtering these out, a common word matches
# every entry roughly equally and just dilutes the score toward whichever
# entry happens to be longest, rather than the one actually on-topic.
_STOPWORDS = frozenset(
    """
    a an the is are was were be been being do does did
    what when where who why how which
    i you he she it we they this that these those
    of to in on at for with about as by from into
    and or but if then than so
    can could will would should
    my your our their its
    tell me about please explain describe
    """.split()
)


def parse_entry(path: Path) -> dict | None:
    """Splits a markdown file into {slug, title, body}. Returns None for a
    file with no YAML frontmatter block (shouldn't happen for a real entry,
    but a malformed file should be skipped, not crash the whole sync)."""
    raw = path.read_text(encoding="utf-8")
    match = _FRONTMATTER_RE.match(raw)
    if not match:
        return None
    frontmatter_raw, body = match.groups()
    data = yaml.safe_load(frontmatter_raw) or {}
    # Different content types name their title field differently (news/guides
    # use `title`, glossary uses `term`, models uses `name`, skills uses `role`)
    # -- try each rather than forcing every markdown file to agree on one key.
    title = data.get("title") or data.get("term") or data.get("name") or data.get("role") or path.stem
    return {"slug": path.stem, "title": str(title), "body": body.strip()}


def sync_from_disk(db: Session, entries_dir: Path) -> int:
    """Upserts every entries_dir/<type>/*.md into ContentEntry, matched by
    (type, slug). Additive and update-in-place only -- never deletes a row,
    so a markdown file removed from disk just stops being refreshed rather
    than disappearing from the assistant's index mid-conversation. Returns
    how many rows were created or changed."""
    changed = 0
    for content_type, url_template in CONTENT_TYPES.items():
        type_dir = entries_dir / content_type
        if not type_dir.is_dir():
            continue
        for md_file in sorted(type_dir.glob("*.md")):
            parsed = parse_entry(md_file)
            if not parsed:
                continue
            url_path = url_template.format(slug=parsed["slug"])
            existing = db.query(ContentEntry).filter_by(type=content_type, slug=parsed["slug"]).one_or_none()
            if existing is None:
                db.add(
                    ContentEntry(
                        type=content_type,
                        slug=parsed["slug"],
                        title=parsed["title"],
                        url_path=url_path,
                        body=parsed["body"],
                    )
                )
                changed += 1
            elif existing.title != parsed["title"] or existing.body != parsed["body"]:
                existing.title = parsed["title"]
                existing.body = parsed["body"]
                existing.url_path = url_path
                existing.updated_at = utcnow()
                changed += 1
    db.commit()
    return changed


def search(db: Session, query: str, limit: int = 5) -> list[ContentEntry]:
    """Naive term-frequency keyword search: a title hit counts for more than
    a body hit, and the raw count is normalized by document length so a
    short, precisely-on-topic glossary entry isn't out-scored by a long
    architecture guide that mentions the same words incidentally more
    often in absolute terms. Good enough for grounding an assistant answer
    at this content volume -- not a general-purpose search feature, so it
    doesn't need to be more than that."""
    terms = [t for t in _WORD_RE.findall(query.lower()) if len(t) > 2 and t not in _STOPWORDS]
    if not terms:
        return []
    scored = []
    for entry in db.query(ContentEntry).all():
        title_lower = entry.title.lower()
        body_lower = entry.body.lower()
        raw_score = sum(title_lower.count(t) * 3 + body_lower.count(t) for t in terms)
        if raw_score > 0:
            length_penalty = math.sqrt(len(body_lower.split()) + 1)
            scored.append((raw_score / length_penalty, entry))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [entry for _, entry in scored[:limit]]
