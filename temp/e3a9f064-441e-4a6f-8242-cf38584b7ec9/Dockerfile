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

# Transpile the code (if necessary, e.g., using Babel)
# For React Native, this step might not be necessary as Metro handles the bundling
# But if you have custom build steps, add them here.
# Example: RUN npm run build

# --- Production Image ---
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy the production dependencies from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/index.js ./
COPY --from=builder /app/package.json ./package.json

# Expose the port your app runs on (default React Native port is 8081)
EXPOSE 8081

# Define environment variables (if needed)
ENV NODE_ENV production

# Set the command to start the application
CMD ["npm", "start"]