# Meter backend — FastAPI + SQLite (or Postgres via METER_DATABASE_URL).
#
# Build:  docker build -t meter-backend ./backend
# Run:    docker run -p 8000:8000 -v meter-db:/data meter-backend
# (see ../docker-compose.yml for the normal way to run this alongside the frontend)

FROM python:3.11-slim

WORKDIR /app

# Install deps in their own layer so `docker build` only reinstalls when
# requirements.txt actually changes, not on every source edit.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY seed.py entrypoint.sh ./

# Run as a non-root user. /data is where the sqlite file lives — chowning it
# here means a fresh named volume (which Docker seeds from the image's copy
# of this directory on first mount) inherits the right ownership.
RUN chmod +x entrypoint.sh \
    && useradd --create-home --uid 1000 meter \
    && mkdir -p /data \
    && chown -R meter:meter /app /data
USER meter

ENV METER_DATABASE_URL=sqlite:////data/meter.db \
    METER_DB_FILE=/data/meter.db \
    PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/healthz', timeout=2)" || exit 1

ENTRYPOINT ["./entrypoint.sh"]
