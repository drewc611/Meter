.PHONY: help install seed run test lint fmt clean

help:
	@echo "make install  - install runtime + dev dependencies"
	@echo "make seed     - build meter.db with a month of sample data"
	@echo "make run      - start the API on :8000 (uvicorn --reload)"
	@echo "make test     - run the pytest suite"
	@echo "make lint     - ruff check"
	@echo "make fmt      - ruff format + import fixes"
	@echo "make clean    - remove meter.db and caches"

install:
	pip install -r requirements.txt -r requirements-dev.txt

seed:
	python seed.py

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
	rm -f meter.db
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
	rm -rf .pytest_cache .ruff_cache
