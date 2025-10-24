# Use multi-stage builds to optimize image size
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock/pnpm-lock.yaml)
COPY package.json ./

# Install dependencies based on environment
ARG NODE_ENV=development
RUN if [ "$NODE_ENV" = "production" ]; then npm ci --only=production; else npm install; fi

# Copy source files
COPY . .

# Build the application
RUN npm run build

# --- Production Stage ---
FROM nginx:alpine

# Copy the build output from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration (if needed, otherwise use default)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Set environment variables (example)
ENV NODE_ENV production

# Health check (example)
HEALTHCHECK --interval=5m --timeout=3s \
  CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]