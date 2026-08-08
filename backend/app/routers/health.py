"""Liveness probe."""

from fastapi import APIRouter

from .. import schemas

router = APIRouter(tags=["health"])


@router.get("/healthz", response_model=schemas.HealthOut)
def healthz():
    return schemas.HealthOut()
