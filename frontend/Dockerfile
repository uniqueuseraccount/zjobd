# --- VERSION 1.1.0 ---
# - Multi-stage build for React frontend
# - Builds production assets and serves via Nginx
# - Includes custom nginx.conf for API proxying

# Build stage
FROM node:20-slim as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
