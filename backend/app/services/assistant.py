"""
The site's AI assistant: answers a visitor's question using only what's in
ContentEntry (see content_index.py) -- never the model's own general
knowledge about the company, since an unsourced claim about the business is
exactly what this whole product argues against elsewhere on the site.

Requires ANTHROPIC_API_KEY. ask() raises AssistantUnavailable when it's
unset so routers/assistant.py can return a clear, graceful error instead of
the process crashing on a visitor's first question -- same "unset ->
disabled, not broken" pattern services/email.py and the Stripe/booking
frontend config already use.
"""

import os

from sqlalchemy.orm import Session

from . import content_index

SYSTEM_PROMPT = """You are the AI assistant on Merit AC's website. Answer the visitor's \
question using ONLY the excerpts provided below -- real content already published on \
this site. If the excerpts don't actually answer the question, say so plainly rather \
than guessing or filling in from outside knowledge. Keep answers short and concrete. \
When you draw on a specific excerpt, name which page it's from so the visitor can go \
read the rest there."""

MODEL = "claude-opus-5"
MAX_EXCERPT_CHARS = 2000


class AssistantUnavailable(Exception):
    """ANTHROPIC_API_KEY isn't configured -- ask() can't run at all."""


def ask(db: Session, question: str) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise AssistantUnavailable("ANTHROPIC_API_KEY is not set")

    matches = content_index.search(db, question, limit=5)
    if not matches:
        return {
            "answer": (
                "I couldn't find anything on the site about that yet -- try rephrasing, "
                "or browse /news, /guides, or /models directly."
            ),
            "sources": [],
        }

    excerpts = "\n\n".join(f"### {m.title} ({m.url_path})\n{m.body[:MAX_EXCERPT_CHARS]}" for m in matches)

    import anthropic  # imported lazily -- only needed on this code path

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"Excerpts:\n\n{excerpts}\n\nQuestion: {question}"}],
    )
    answer = next((block.text for block in response.content if block.type == "text"), "")
    return {
        "answer": answer,
        "sources": [{"title": m.title, "url": m.url_path} for m in matches],
    }
