"""
The site's public AI assistant -- answers a visitor's question about the
site's own content. Ungated like /waitlist (an anonymous visitor has no
token), but rate-limited: unlike /waitlist this costs a real Claude API
call per request, so an unthrottled endpoint is a way for one host to run
up the bill, not just fill a table with junk rows.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas
from ..dependencies import get_db
from ..services import ratelimit
from ..services.assistant import AssistantUnavailable, ask

router = APIRouter(prefix="/assistant", tags=["assistant"])

_ASK_LIMIT = ratelimit.limit("assistant-ask", max_requests=20, window_seconds=3600)


@router.post("/ask", response_model=schemas.AssistantAskOut, dependencies=[Depends(_ASK_LIMIT)])
def assistant_ask(body: schemas.AssistantAskIn, db: Session = Depends(get_db)):
    try:
        result = ask(db, body.question)
    except AssistantUnavailable as e:
        raise HTTPException(
            status_code=503, detail="The assistant isn't configured yet -- ANTHROPIC_API_KEY is unset."
        ) from e
    return schemas.AssistantAskOut(**result)
