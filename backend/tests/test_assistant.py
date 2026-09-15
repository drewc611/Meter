"""/assistant/ask: public, rate-limited, grounded-only in ContentEntry rows,
and degrades to a clear 503 rather than crashing when ANTHROPIC_API_KEY is
unset."""

from app import models


def _seed_entry(db):
    db.add(
        models.ContentEntry(
            type="glossary",
            slug="hallucination",
            title="Hallucination",
            url_path="/glossary#hallucination",
            body="A model generating fluent but factually wrong text.",
        )
    )
    db.commit()


def test_ask_without_api_key_returns_503(client, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    r = client.post("/assistant/ask", json={"question": "what is a hallucination"})
    assert r.status_code == 503


def test_ask_with_no_matching_content_returns_a_plain_fallback_without_calling_claude(client, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")

    def fail(*args, **kwargs):
        raise AssertionError("should not call the Claude API when there are no matches")

    monkeypatch.setattr("anthropic.Anthropic.__init__", lambda self, **kw: None)
    monkeypatch.setattr("anthropic.resources.messages.Messages.create", fail)

    r = client.post("/assistant/ask", json={"question": "zzznonexistentqueryterm"})
    assert r.status_code == 200
    body = r.json()
    assert body["sources"] == []
    assert "couldn't find" in body["answer"].lower()


def test_ask_grounds_the_answer_in_matched_content(client, db, monkeypatch):
    _seed_entry(db)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")

    class FakeTextBlock:
        type = "text"
        text = "A hallucination is when a model states something false with confidence."

    class FakeResponse:
        content = [FakeTextBlock()]

    captured = {}

    def fake_create(self, **kwargs):
        captured.update(kwargs)
        return FakeResponse()

    monkeypatch.setattr("anthropic.Anthropic.__init__", lambda self, **kw: None)
    monkeypatch.setattr("anthropic.resources.messages.Messages.create", fake_create)

    r = client.post("/assistant/ask", json={"question": "what is a hallucination"})
    assert r.status_code == 200
    body = r.json()
    assert body["answer"] == "A hallucination is when a model states something false with confidence."
    assert body["sources"] == [{"title": "Hallucination", "url": "/glossary#hallucination"}]
    # The excerpt actually reached the model -- this is what makes the
    # answer grounded rather than the model's own general knowledge.
    assert "A model generating fluent but factually wrong text." in captured["messages"][0]["content"]


def test_ask_rejects_empty_question(client):
    r = client.post("/assistant/ask", json={"question": ""})
    assert r.status_code == 422


def test_ask_rejects_oversized_question(client):
    r = client.post("/assistant/ask", json={"question": "x" * 2000})
    assert r.status_code == 422


def test_ask_is_rate_limited(client, db, monkeypatch):
    _seed_entry(db)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")

    class FakeTextBlock:
        type = "text"
        text = "answer"

    class FakeResponse:
        content = [FakeTextBlock()]

    monkeypatch.setattr("anthropic.Anthropic.__init__", lambda self, **kw: None)
    monkeypatch.setattr("anthropic.resources.messages.Messages.create", lambda self, **kw: FakeResponse())

    for _ in range(20):
        assert client.post("/assistant/ask", json={"question": "hallucination"}).status_code == 200
    r = client.post("/assistant/ask", json={"question": "hallucination"})
    assert r.status_code == 429
