# Merit frontend — static dashboard, served by nginx.
#
# Build:  docker build -t merit-frontend ./frontend
# Run:    docker run -p 8080:80 merit-frontend
# (see ../docker-compose.yml for the normal way to run this alongside the backend)
#
# The dashboard is plain static files (index.html/styles.css/app.js/
# fallback-data.js) that call the backend directly from the browser at
# http://localhost:8000 — nginx here just serves files, it does not proxy
# API calls. See app.js's API_BASE if that origin needs to change.

FROM nginx:1.27-alpine

COPY index.html styles.css app.js fallback-data.js /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=3s --retries=5 \
    CMD wget -qO- http://localhost/ >/dev/null || exit 1
