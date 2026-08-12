# Merit frontend — Vite/React dashboard, built then served by nginx.
#
# Build:  docker build -t merit-frontend ./frontend
# Run:    docker run -p 8080:80 merit-frontend
# (see ../docker-compose.yml for the normal way to run this alongside the backend)
#
# Two stages: the first runs the Vite build (React dashboard + the static
# coming-soon.html, both HTML entries in vite.config.js) into dist/; the
# second just serves that dist/ with nginx -- no Node or build tooling ships
# in the final image.
#
# The dashboard calls the backend directly from the browser at
# http://localhost:8000 — nginx here just serves files, it does not proxy
# API calls. See src/lib/api.js's API_BASE if that origin needs to change.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=3s --retries=5 \
    CMD wget -qO- http://localhost/ >/dev/null || exit 1
