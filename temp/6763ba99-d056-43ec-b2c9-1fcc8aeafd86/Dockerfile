# Use a Node.js base image for building the application
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock/pnpm-lock.yaml)
COPY package.json ./

# Install dependencies.  Use npm ci for production, npm install for development
ARG NODE_ENV=production
RUN if [ "$NODE_ENV" = "production" ]; then npm ci --only=production; else npm install; fi

# Copy the rest of the application code
COPY . .

# Build the application (if needed - React Native doesn't typically have a "build" step like web apps)
# RUN npm run build  # Remove this line as there is no build script

# --- Production Image ---
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy the production dependencies from the builder stage
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Copy the application code from the builder stage
COPY --from=builder /app .

# Expose the port the app runs on (default React Native port is 8081)
EXPOSE 8081

# Define environment variable
ENV NODE_ENV production

# Define command to start the app
CMD ["npm", "start"]