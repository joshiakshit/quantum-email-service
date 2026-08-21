FROM node:20-alpine AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM python:3.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libffi-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-gateway.txt
COPY key-manager/requirements.txt requirements-km.txt
RUN pip install --no-cache-dir \
    -r requirements-gateway.txt \
    -r requirements-km.txt \
    fastapi uvicorn[standard]

COPY crypto/ crypto/
COPY qkd_sim/ qkd_sim/
COPY email_pipeline/ email_pipeline/
COPY storage/ storage/
COPY gateway/ gateway/
COPY key-manager/ key-manager/
COPY --from=frontend /build/dist /app/frontend-build

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 9000

CMD ["/app/entrypoint.sh"]
