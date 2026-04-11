# --- VERSION 1.0.0 ---
# - Multi-stage build for Python backend
# - Supports amd64 and arm64 architectures
# - Optimized for slim production deployment

# Build stage
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies for mysql-connector and other C extensions
RUN apt-get update && apt-get install -y \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final stage
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY . .

# Environment defaults
ENV FLASK_APP=app.py
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 5001

CMD ["python", "app.py"]
