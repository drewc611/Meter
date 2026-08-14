.PHONY: help install seed github-sync recompute run test lint fmt clean

help:
	@echo "make install      - install runtime + dev dependencies"
	@echo "make seed         - build merit.db with 6 months of sample data"
	@echo "make github-sync  - pull merged PRs/CI status from MERIT_GITHUB_OWNER/REPO"
	@echo "make recompute    - recompute PersonScore for the current period"
	@echo "make run          - start the API on :8000 (uvicorn --reload)"
	@echo "make test         - run the pytest suite"
	@echo "make lint         - ruff check"
	@echo "make fmt          - ruff format + import fixes"
	@echo "make clean        - remove merit.db and caches"

install:
	pip install -r requirements.txt -r requirements-dev.txt

seed:
	python seed.py

github-sync:
	python github_sync.py

recompute:
	python recompute.py

run:
	uvicorn app.main:app --reload --port 8000

test:
	pytest

lint:
	ruff check .

fmt:
	ruff check --select I --fix .
	ruff format .

clean:
	rm -f merit.db
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
	rm -rf .pytest_cache .ruff_cache
