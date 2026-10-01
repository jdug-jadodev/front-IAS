FROM node:24-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build \
    && INDEX_FILE="$(find dist -type f -name index.html -print -quit)" \
    && test -n "$INDEX_FILE" \
    && mkdir -p /app/site \
    && cp -a "$(dirname "$INDEX_FILE")"/. /app/site/

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/site/ /usr/share/nginx/html/

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
    CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
