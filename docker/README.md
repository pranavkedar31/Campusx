# Docker Deployment Configurations

This directory contains standalone containerization configurations and production server proxies for CampusX.

- `backend/Dockerfile`: Python 3.12-slim production image.
- `frontend/Dockerfile`: Multi-stage build with Nginx reverse proxy.
- `frontend/nginx.conf`: Nginx routing rules and API proxy configuration.
