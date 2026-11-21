FROM python:3.11-slim

WORKDIR /app

# Copy the ml package, models, and the pilot zones the reference service reads at startup.
# Build context is the repo root: docker compose build --no-cache ml
COPY ml/ /app/ml/
COPY data/test_zones.geojson /app/data/test_zones.geojson

WORKDIR /app/ml
RUN pip install --no-cache-dir ".[service]"

EXPOSE 8100
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8100/api/v1/ml/health')"

CMD ["uvicorn", "service.app:app", "--host", "0.0.0.0", "--port", "8100"]
