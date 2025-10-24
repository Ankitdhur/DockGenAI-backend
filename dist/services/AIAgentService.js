"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIAgentService = void 0;
const google_genai_1 = require("@langchain/google-genai");
class AIAgentService {
    constructor() {
        this.chatModel = new google_genai_1.ChatGoogleGenerativeAI({
            model: 'gemini-2.0-flash',
            temperature: 0.1,
            apiKey: process.env.GEMINI_API_KEY
        });
    }
    async detectTechStack(repoData) {
        try {
            const systemPrompt = `You are an expert at detecting JavaScript frameworks and technologies from repository data. 
      Analyze the provided repository information and return a list of detected technologies.
      
      Focus on:
      - JavaScript frameworks (React, Next.js, Vue, Angular, Express, etc.)
      - Build tools (Webpack, Vite, Parcel, etc.)
      - Package managers (npm, yarn, pnpm)
      - Testing frameworks (Jest, Mocha, Cypress, etc.)
      - Database technologies (MongoDB, PostgreSQL, MySQL, etc.)
      - Runtime environments (Node.js, Deno, etc.)
      
      Return only the technology names as a JSON array.`;
            const userPrompt = `Repository: ${repoData.fullName}
Description: ${repoData.description}
Language: ${repoData.language}
Dependencies: ${repoData.dependencies?.join(', ') || 'None'}
Dev Dependencies: ${repoData.devDependencies?.join(', ') || 'None'}
Scripts: ${Object.keys(repoData.scripts || {}).join(', ') || 'None'}
Files: ${repoData.files.map(f => f.name).join(', ')}`;
            const prompt = `${systemPrompt}\n\n${userPrompt}`;
            const response = await this.chatModel.invoke(prompt);
            const content = typeof response === 'string' ? response : response.content;
            // Parse the response to extract technology names
            const techStack = this.parseTechStackResponse(content);
            return techStack;
        }
        catch (error) {
            console.error('Error detecting tech stack:', error);
            // Handle Gemini API quota exceeded error
            if (error instanceof Error && error.message.includes('quota')) {
                console.warn('Gemini API quota exceeded, using fallback detection');
                return this.fallbackTechStackDetection(repoData);
            }
            // Fallback to basic detection based on dependencies
            return this.fallbackTechStackDetection(repoData);
        }
    }
    async generateDockerfile(repoData, techStack) {
        try {
            const systemPrompt = `You are an expert Docker engineer. Generate a production-ready, runnable Dockerfile for the given JavaScript project.

CRITICAL REQUIREMENTS:
- The Dockerfile MUST successfully build and run without errors
- ONLY use files that are guaranteed to exist: package.json, index.js, and any files explicitly mentioned
- DO NOT reference directories or files that may not exist (like expo-router/, assets/, app.json, scripts/, etc.)
- Use appropriate base images (prefer Alpine for smaller size)
- Handle all dependencies correctly (production and dev dependencies)
- Use multi-stage builds for optimization
- Include proper error handling and health checks
- Set correct working directories and file permissions
- Use non-root user for security
- Optimize layer caching with proper COPY order
- Include proper CMD/ENTRYPOINT that actually starts the application
- Handle different package managers (npm, yarn, pnpm)
- Support both development and production builds
- Include proper environment variable handling
- Use .dockerignore patterns when appropriate

TECH STACK SPECIFIC REQUIREMENTS:
- React: Use nginx to serve static files, include proper build process
- Next.js: Use standalone output, proper server setup
- Express/Node.js: Include proper startup scripts and port handling
- Vue: Handle build process and static file serving
- Angular: Include proper build and serve configuration

VALIDATION REQUIREMENTS:
- Every RUN command must be valid and executable
- All COPY commands must reference existing files
- BUILD CONTEXT LIMITATION: Only package.json, index.js, and .dockerignore are guaranteed to exist
- DO NOT assume complex project structures exist (no expo-router/, assets/, app.json, scripts/, etc.)
- Ports must be properly exposed
- CMD must start the actual application
- Include proper error handling for missing files

DOCKER SYNTAX REQUIREMENTS:
- Use ONLY valid Docker instructions: FROM, RUN, COPY, ADD, WORKDIR, EXPOSE, ENV, CMD, ENTRYPOINT, USER, LABEL, ARG, VOLUME, HEALTHCHECK
- NEVER use 'else' as a standalone instruction - use proper shell syntax within RUN commands
- ALWAYS prefix shell commands with RUN (e.g., 'RUN adduser' not 'adduser')
- Use proper multi-line syntax with backslashes for long commands
- Ensure all instructions follow proper Docker syntax

CORRECT SYNTAX EXAMPLES:
- RUN adduser --disabled-password --gecos "" appuser
- RUN if [ "$NODE_ENV" = "production" ]; then npm ci --only=production; else npm install; fi
- RUN apt-get update && apt-get install -y curl
- COPY package.json ./
- WORKDIR /app
- EXPOSE 3000
- CMD ["npm", "start"]

Return ONLY the Dockerfile content, no explanations or markdown formatting.`;
            const userPrompt = `Repository: ${repoData.fullName}
Tech Stack: ${techStack.join(', ')}
Dependencies: ${repoData.dependencies?.join(', ') || 'None'}
Dev Dependencies: ${repoData.devDependencies?.join(', ') || 'None'}
Scripts: ${JSON.stringify(repoData.scripts || {})}
Package.json content: ${JSON.stringify(repoData.packageJson || {})}
Main file: ${repoData.packageJson?.main || 'index.js'}
Start script: ${repoData.scripts?.start || 'node index.js'}
Build script: ${repoData.scripts?.build || 'npm run build'}

Generate a production-ready, runnable Dockerfile that will successfully build and run.`;
            const prompt = `${systemPrompt}\n\n${userPrompt}`;
            const response = await this.chatModel.invoke(prompt);
            const dockerfile = typeof response === 'string' ? response : response.content;
            const cleanedDockerfile = this.cleanDockerfile(dockerfile);
            // Validate the generated Dockerfile syntax
            if (this.hasInvalidDockerSyntax(cleanedDockerfile)) {
                console.warn('Generated Dockerfile has invalid syntax, using fallback');
                return this.generateFallbackDockerfile(repoData, techStack);
            }
            return cleanedDockerfile;
        }
        catch (error) {
            console.error('Error generating Dockerfile:', error);
            // Handle Gemini API quota exceeded error
            if (error instanceof Error && error.message.includes('quota')) {
                console.warn('Gemini API quota exceeded, using fallback Dockerfile generation');
                return this.generateFallbackDockerfile(repoData, techStack);
            }
            // Fallback to basic Dockerfile generation
            return this.generateFallbackDockerfile(repoData, techStack);
        }
    }
    parseTechStackResponse(response) {
        try {
            // Try to extract JSON array from response
            const jsonMatch = response.match(/\[.*?\]/s);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return Array.isArray(parsed) ? parsed : [];
            }
            // Fallback: extract technology names from text
            const techKeywords = [
                'React', 'Next.js', 'Vue', 'Angular', 'Express', 'Node.js',
                'TypeScript', 'JavaScript', 'Webpack', 'Vite', 'Parcel',
                'npm', 'yarn', 'pnpm', 'Jest', 'Mocha', 'Cypress',
                'MongoDB', 'PostgreSQL', 'MySQL', 'Redis'
            ];
            const detected = techKeywords.filter(tech => response.toLowerCase().includes(tech.toLowerCase()));
            return detected.length > 0 ? detected : ['JavaScript', 'Node.js'];
        }
        catch (error) {
            console.error('Error parsing tech stack response:', error);
            return ['JavaScript', 'Node.js'];
        }
    }
    fallbackTechStackDetection(repoData) {
        const techStack = ['JavaScript'];
        // Detect based on dependencies
        const dependencies = repoData.dependencies || [];
        const devDependencies = repoData.devDependencies || [];
        if (dependencies.includes('react') || devDependencies.includes('react')) {
            techStack.push('React');
        }
        if (dependencies.includes('next') || devDependencies.includes('next')) {
            techStack.push('Next.js');
        }
        if (dependencies.includes('vue') || devDependencies.includes('vue')) {
            techStack.push('Vue');
        }
        if (dependencies.includes('@angular/core') || devDependencies.includes('@angular/core')) {
            techStack.push('Angular');
        }
        if (dependencies.includes('express') || devDependencies.includes('express')) {
            techStack.push('Express');
        }
        if (dependencies.includes('typescript') || devDependencies.includes('typescript')) {
            techStack.push('TypeScript');
        }
        // Detect package manager
        if (repoData.files.some(f => f.name === 'yarn.lock')) {
            techStack.push('Yarn');
        }
        else if (repoData.files.some(f => f.name === 'package-lock.json')) {
            techStack.push('npm');
        }
        return techStack;
    }
    hasInvalidDockerSyntax(dockerfile) {
        const lines = dockerfile.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith('#'))
                continue;
            // Check for invalid standalone instructions
            if (trimmedLine === 'else' || trimmedLine === 'fi' || trimmedLine === 'end') {
                return true;
            }
            // Check for commands without RUN prefix
            if (trimmedLine.startsWith('adduser') ||
                trimmedLine.startsWith('apt-get') ||
                trimmedLine.startsWith('npm') ||
                trimmedLine.startsWith('yarn') ||
                trimmedLine.startsWith('pnpm')) {
                return true;
            }
        }
        return false;
    }
    generateFallbackDockerfile(repoData, techStack) {
        const isReact = techStack.includes('React');
        const isNext = techStack.includes('Next.js');
        const isVue = techStack.includes('Vue');
        const isAngular = techStack.includes('Angular');
        const isExpress = techStack.includes('Express');
        const hasTypeScript = techStack.includes('TypeScript');
        // Get package manager preference
        const hasYarnLock = repoData.files?.some(f => f.name === 'yarn.lock');
        const hasPnpmLock = repoData.files?.some(f => f.name === 'pnpm-lock.yaml');
        const packageManager = hasPnpmLock ? 'pnpm' : hasYarnLock ? 'yarn' : 'npm';
        // Get start command
        const startScript = repoData.scripts?.start || 'node index.js';
        const buildScript = repoData.scripts?.build || 'npm run build';
        const mainFile = repoData.packageJson?.main || 'index.js';
        if (isNext) {
            return `# Next.js Application
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN ${packageManager === 'yarn' ? 'yarn --frozen-lockfile' : packageManager === 'pnpm' ? 'pnpm install --frozen-lockfile' : 'npm ci --only=production'}

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN ${packageManager === 'yarn' ? 'yarn build' : packageManager === 'pnpm' ? 'pnpm build' : 'npm run build'}

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]`;
        }
        if (isReact) {
            return `# React Application
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install dependencies
RUN ${packageManager === 'yarn' ? 'yarn install --frozen-lockfile' : packageManager === 'pnpm' ? 'pnpm install --frozen-lockfile' : 'npm ci'}

# Copy source code
COPY . ./

# Build the application
RUN ${packageManager === 'yarn' ? 'yarn build' : packageManager === 'pnpm' ? 'pnpm build' : 'npm run build'}

# Production stage with nginx
FROM nginx:stable-alpine

# Copy built assets
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration if it exists, otherwise use default
COPY nginx.conf /etc/nginx/nginx.conf 2>/dev/null || true

# Create non-root user
RUN addgroup -g 1001 -S nginx && adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html

USER nginx

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]`;
        }
        if (isVue) {
            return `# Vue.js Application
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install dependencies
RUN ${packageManager === 'yarn' ? 'yarn install --frozen-lockfile' : packageManager === 'pnpm' ? 'pnpm install --frozen-lockfile' : 'npm ci'}

# Copy source code
COPY . ./

# Build the application
RUN ${packageManager === 'yarn' ? 'yarn build' : packageManager === 'pnpm' ? 'pnpm build' : 'npm run build'}

# Production stage with nginx
FROM nginx:stable-alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S nginx && adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html

USER nginx

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]`;
        }
        if (isAngular) {
            return `# Angular Application
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install dependencies
RUN ${packageManager === 'yarn' ? 'yarn install --frozen-lockfile' : packageManager === 'pnpm' ? 'pnpm install --frozen-lockfile' : 'npm ci'}

# Copy source code
COPY . ./

# Build the application
RUN ${packageManager === 'yarn' ? 'yarn build' : packageManager === 'pnpm' ? 'pnpm build' : 'npm run build'}

# Production stage with nginx
FROM nginx:stable-alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S nginx && adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html

USER nginx

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]`;
        }
        if (isExpress) {
            return `# Express.js Application
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G nodejs -g nodejs nodejs

# Copy package files
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install dependencies
RUN ${packageManager === 'yarn' ? 'yarn install --frozen-lockfile --production' : packageManager === 'pnpm' ? 'pnpm install --frozen-lockfile --prod' : 'npm ci --only=production'} && \\
    ${packageManager === 'yarn' ? 'yarn cache clean' : packageManager === 'pnpm' ? 'pnpm store prune' : 'npm cache clean --force'}

# Copy source code
COPY --chown=nodejs:nodejs . .

# Set proper permissions
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))" || exit 1

CMD ["${startScript}"]`;
        }
        // Default Node.js application
        return `# Node.js Application
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G nodejs -g nodejs nodejs

# Copy package files
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install dependencies
RUN ${packageManager === 'yarn' ? 'yarn install --frozen-lockfile --production' : packageManager === 'pnpm' ? 'pnpm install --frozen-lockfile --prod' : 'npm ci --only=production'} && \\
    ${packageManager === 'yarn' ? 'yarn cache clean' : packageManager === 'pnpm' ? 'pnpm store prune' : 'npm cache clean --force'}

# Copy source code
COPY --chown=nodejs:nodejs . .

# Set proper permissions
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))" || exit 1

CMD ["${startScript}"]`;
    }
    cleanDockerfile(dockerfile) {
        // Remove any markdown formatting or code blocks
        return dockerfile
            .replace(/```dockerfile\n?/g, '')
            .replace(/```\n?/g, '')
            .replace(/^# Generated Dockerfile.*$/gm, '')
            .trim();
    }
}
exports.AIAgentService = AIAgentService;
//# sourceMappingURL=AIAgentService.js.map