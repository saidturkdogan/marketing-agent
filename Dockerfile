FROM python:3.10-slim

# System deps for psycopg binary and lxml
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq-dev \
        gcc \
        libxml2-dev \
        libxslt-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# API default port
EXPOSE 8080

# Default command: override in docker-compose per service
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8080"]
