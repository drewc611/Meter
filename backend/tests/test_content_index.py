"""services/content_index.py: markdown -> ContentEntry sync, and the naive
keyword search that feeds the assistant."""

from app import models
from app.services import content_index


def _write_entry(tmp_path, content_type, slug, frontmatter, body):
    type_dir = tmp_path / content_type
    type_dir.mkdir(parents=True, exist_ok=True)
    (type_dir / f"{slug}.md").write_text(f"---\n{frontmatter}\n---\n{body}\n", encoding="utf-8")


def test_sync_from_disk_creates_rows(tmp_path, db):
    _write_entry(
        tmp_path,
        "glossary",
        "hallucination",
        "term: Hallucination\ncategory: model-architecture",
        "A model making things up.",
    )
    changed = content_index.sync_from_disk(db, tmp_path)
    assert changed == 1
    row = db.query(models.ContentEntry).filter_by(type="glossary", slug="hallucination").one()
    assert row.title == "Hallucination"
    assert row.url_path == "/glossary#hallucination"
    assert row.body == "A model making things up."


def test_sync_is_idempotent(tmp_path, db):
    _write_entry(tmp_path, "news", "some-article", "title: Some Article\ndate: '2026-01-01'", "Body text.")
    first = content_index.sync_from_disk(db, tmp_path)
    second = content_index.sync_from_disk(db, tmp_path)
    assert first == 1
    assert second == 0
    assert db.query(models.ContentEntry).count() == 1


def test_sync_updates_changed_content_in_place(tmp_path, db):
    _write_entry(tmp_path, "news", "some-article", "title: Some Article\ndate: '2026-01-01'", "Original body.")
    content_index.sync_from_disk(db, tmp_path)

    _write_entry(tmp_path, "news", "some-article", "title: Some Article\ndate: '2026-01-01'", "Updated body.")
    changed = content_index.sync_from_disk(db, tmp_path)

    assert changed == 1
    assert db.query(models.ContentEntry).count() == 1
    row = db.query(models.ContentEntry).filter_by(type="news", slug="some-article").one()
    assert row.body == "Updated body."


def test_sync_never_deletes_a_row_removed_from_disk(tmp_path, db):
    _write_entry(tmp_path, "news", "keeper", "title: Keeper\ndate: '2026-01-01'", "Still here.")
    content_index.sync_from_disk(db, tmp_path)
    (tmp_path / "news" / "keeper.md").unlink()
    content_index.sync_from_disk(db, tmp_path)
    assert db.query(models.ContentEntry).filter_by(type="news", slug="keeper").count() == 1


def test_sync_skips_a_content_type_folder_that_does_not_exist(tmp_path, db):
    # No "models/" folder under tmp_path at all -- shouldn't raise.
    changed = content_index.sync_from_disk(db, tmp_path)
    assert changed == 0


def test_sync_uses_the_right_title_field_per_content_type(tmp_path, db):
    _write_entry(tmp_path, "models", "claude", "name: Claude\nmaker: Anthropic", "An AI model.")
    _write_entry(tmp_path, "skills", "cto", "role: CTO", "A skill for engineering leaders.")
    content_index.sync_from_disk(db, tmp_path)
    assert db.query(models.ContentEntry).filter_by(type="models", slug="claude").one().title == "Claude"
    assert db.query(models.ContentEntry).filter_by(type="skills", slug="cto").one().title == "CTO"


def test_search_finds_the_relevant_entry(db):
    db.add(
        models.ContentEntry(
            type="glossary",
            slug="hallucination",
            title="Hallucination",
            url_path="/glossary#hallucination",
            body="A model generating fluent but factually wrong text.",
        )
    )
    db.add(
        models.ContentEntry(
            type="glossary",
            slug="token",
            title="Token",
            url_path="/glossary#token",
            body="A chunk of text the model processes.",
        )
    )
    db.commit()
    results = content_index.search(db, "what is a hallucination", limit=5)
    assert [r.slug for r in results] == ["hallucination"]


def test_search_ranks_a_short_precise_entry_over_a_long_tangential_one(db):
    db.add(
        models.ContentEntry(
            type="glossary",
            slug="recoverable-spend",
            title="Recoverable spend",
            url_path="/glossary#recoverable-spend",
            body="An estimate of how much AI spend an organization could recover by addressing low-value usage.",
        )
    )
    # A long, genuinely different-topic document that happens to mention
    # "spend" a couple of times in passing -- not keyword-stuffed, just
    # longer, the way a real architecture guide naturally is next to a
    # one-line glossary definition.
    db.add(
        models.ContentEntry(
            type="cloud-architecture",
            slug="cost-optimization",
            title="Cloud cost optimization",
            url_path="/cloud-architecture/cost-optimization",
            body=(
                "Right-sizing instances, reserved capacity, and spot pricing are the three levers "
                "that matter most for a cloud bill. Most teams over-provision compute long before "
                "they ever look at storage tiering or egress costs. A committed-use discount only "
                "pays off once usage is predictable enough to commit to -- guessing wrong means "
                "paying for capacity that sits idle, which is its own kind of wasted spend. "
                "Autoscaling policies, sensible retention windows on logs, and tagging every "
                "resource by owner and environment are the unglamorous groundwork that makes any "
                "of the bigger optimization levers actually safe to pull."
            ),
        )
    )
    db.commit()
    results = content_index.search(db, "how does recoverable spend estimate work", limit=1)
    assert results[0].slug == "recoverable-spend"


def test_search_returns_nothing_for_only_stopwords(db):
    db.add(models.ContentEntry(type="glossary", slug="x", title="X", url_path="/glossary#x", body="something"))
    db.commit()
    assert content_index.search(db, "what is the") == []


def test_search_returns_empty_list_when_nothing_matches(db):
    db.add(models.ContentEntry(type="glossary", slug="x", title="X", url_path="/glossary#x", body="something"))
    db.commit()
    assert content_index.search(db, "zzznonexistentqueryterm") == []
