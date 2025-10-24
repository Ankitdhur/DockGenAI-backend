# Use a Node.js base image for building the application
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock/pnpm-lock.yaml)
COPY package.json ./

# Install dependencies.  Use npm ci for production, npm install for development
ARG NODE_ENV=production
RUN if [ "$NODE_ENV" = "production" ]; then npm ci --only=production; else npm install; fi

# Copy the application source code
COPY . .

# Build the application (if needed, based on the tech stack)
# For React Native, no explicit build step is needed for production, Metro handles it.
# If you had a web build step, it would go here.

# --- Production Image ---
FROM node:20-alpine

WORKDIR /app

# Copy built artifacts from the builder stage
COPY --from=builder /app .

# Expose the port the app runs on (default React Native port is 8081)
EXPOSE 8081

# Define environment variables (if needed)
ENV NODE_ENV production

# Health check (example, adjust as needed)
HEALTHCHECK --interval=5m --timeout=3s \
  CMD curl -f http://localhost:8081 || exit 1

# Run as non-root user
RUN adduser --disabled-password --gecos "" appuser
USER appuser

# Start the application
CMD ["npm", "start"]