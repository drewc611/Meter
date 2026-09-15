"""
Mirrors frontend/src/content/entries/ markdown into the ContentEntry table
so the AI assistant (app/services/assistant.py) always has current site
content to read from. Safe to rerun any time the markdown changes --
idempotent upsert, see app/services/content_index.py.

    python sync_content.py
"""

from pathlib import Path

from app.database import SessionLocal, init_db
from app.services.content_index import sync_from_disk

ENTRIES_DIR = Path(__file__).resolve().parent.parent / "frontend" / "src" / "content" / "entries"

if __name__ == "__main__":
    init_db()
    db = SessionLocal()
    try:
        changed = sync_from_disk(db, ENTRIES_DIR)
        print(f"sync_content: {changed} entries created/updated.")
    finally:
        db.close()
