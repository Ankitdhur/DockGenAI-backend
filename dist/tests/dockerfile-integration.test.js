"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DockerService_1 = require("../services/DockerService");
const AIAgentService_1 = require("../services/AIAgentService");
const DockerfileValidationService_1 = require("../services/DockerfileValidationService");
describe('Dockerfile Integration Tests', () => {
    let dockerService;
    let aiAgentService;
    let validationService;
    beforeEach(() => {
        dockerService = new DockerService_1.DockerService();
        aiAgentService = new AIAgentService_1.AIAgentService();
        validationService = new DockerfileValidationService_1.DockerfileValidationService();
    });
    describe('Dockerfile Generation and Validation', () => {
        it('should generate a valid Dockerfile for a Node.js project', async () => {
            const repoData = {
                fullName: 'test/nodejs-app',
                description: 'A simple Node.js application',
                language: 'JavaScript',
                dependencies: ['express', 'cors'],
                devDependencies: ['nodemon', 'jest'],
                scripts: {
                    start: 'node index.js',
                    dev: 'nodemon index.js',
                    test: 'jest'
                },
                packageJson: {
                    name: 'test-app',
                    version: '1.0.0',
                    main: 'index.js',
                    scripts: {
                        start: 'node index.js'
                    },
                    dependencies: {
                        express: '^4.18.2',
                        cors: '^2.8.5'
                    }
                },
                files: [
                    { name: 'package.json' },
                    { name: 'index.js' },
                    { name: 'package-lock.json' }
                ]
            };
            const techStack = ['Node.js', 'Express', 'JavaScript'];
            const dockerfile = await aiAgentService.generateDockerfile(repoData, techStack);
            expect(dockerfile).toBeDefined();
            expect(dockerfile.length).toBeGreaterThan(0);
            expect(dockerfile).toContain('FROM');
            expect(dockerfile).toContain('WORKDIR');
            expect(dockerfile).toContain('COPY');
            expect(dockerfile).toContain('RUN');
            expect(dockerfile).toContain('EXPOSE');
            expect(dockerfile).toContain('CMD');
        });
        it('should generate a valid Dockerfile for a React project', async () => {
            const repoData = {
                fullName: 'test/react-app',
                description: 'A React application',
                language: 'JavaScript',
                dependencies: ['react', 'react-dom'],
                devDependencies: ['@vitejs/plugin-react', 'vite'],
                scripts: {
                    start: 'vite',
                    build: 'vite build',
                    preview: 'vite preview'
                },
                packageJson: {
                    name: 'react-app',
                    version: '1.0.0',
                    scripts: {
                        start: 'vite',
                        build: 'vite build'
                    },
                    dependencies: {
                        react: '^18.2.0',
                        'react-dom': '^18.2.0'
                    }
                },
                files: [
                    { name: 'package.json' },
                    { name: 'vite.config.js' },
                    { name: 'package-lock.json' }
                ]
            };
            const techStack = ['React', 'Vite', 'JavaScript'];
            const dockerfile = await aiAgentService.generateDockerfile(repoData, techStack);
            expect(dockerfile).toBeDefined();
            expect(dockerfile).toContain('FROM');
            expect(dockerfile).toContain('RUN');
            expect(dockerfile).toContain('COPY');
            expect(dockerfile).toContain('EXPOSE');
        });
        it('should validate Dockerfile syntax correctly', async () => {
            const validDockerfile = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`;
            const invalidDockerfile = `FROM node:18-alpine
WORKDIR /app
INVALID_INSTRUCTION test
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`;
            const validResult = await validationService.validateDockerfile(validDockerfile);
            const invalidResult = await validationService.validateDockerfile(invalidDockerfile);
            expect(validResult.isValid).toBe(true);
            expect(validResult.errors).toHaveLength(0);
            expect(invalidResult.isValid).toBe(false);
            expect(invalidResult.errors.length).toBeGreaterThan(0);
        });
        it('should detect security issues in Dockerfile', async () => {
            const insecureDockerfile = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
USER root
EXPOSE 3000
CMD ["npm", "start"]`;
            const result = await validationService.validateDockerfile(insecureDockerfile);
            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.warnings.some(w => w.includes('root'))).toBe(true);
        });
        it('should suggest best practices', async () => {
            const basicDockerfile = `FROM node:18-alpine
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["npm", "start"]`;
            const result = await validationService.validateDockerfile(basicDockerfile);
            expect(result.suggestions.length).toBeGreaterThan(0);
            expect(result.suggestions.some(s => s.includes('WORKDIR'))).toBe(true);
            expect(result.suggestions.some(s => s.includes('EXPOSE'))).toBe(true);
        });
    });
    describe('Docker Build Process', () => {
        it('should build a Docker image successfully', async () => {
            const testDockerfile = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`;
            const generationId = 'test-build-' + Date.now();
            const result = await dockerService.buildImage(testDockerfile, generationId);
            expect(result.success).toBe(true);
            expect(result.imageId).toBeDefined();
            expect(result.imageId).toContain('dockgen-ai-');
        }, 60000); // 60 second timeout for Docker build
        it('should handle build failures gracefully', async () => {
            const invalidDockerfile = `FROM node:18-alpine
WORKDIR /app
COPY nonexistent-file.txt ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`;
            const generationId = 'test-fail-' + Date.now();
            const result = await dockerService.buildImage(invalidDockerfile, generationId);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        }, 60000);
        it('should test image functionality', async () => {
            const testDockerfile = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`;
            const generationId = 'test-run-' + Date.now();
            const buildResult = await dockerService.buildImage(testDockerfile, generationId);
            expect(buildResult.success).toBe(true);
            if (buildResult.imageId) {
                const testResult = await dockerService.testImage(buildResult.imageId);
                expect(testResult).toBe(true);
            }
        }, 60000);
    });
    describe('Fallback Dockerfile Generation', () => {
        it('should generate fallback Dockerfile for Node.js', async () => {
            const repoData = {
                fullName: 'test/fallback-test',
                description: 'Test fallback generation',
                language: 'JavaScript',
                dependencies: ['express'],
                devDependencies: [],
                scripts: { start: 'node index.js' },
                packageJson: { name: 'test', version: '1.0.0' },
                files: [{ name: 'package.json' }]
            };
            const techStack = ['Node.js', 'Express'];
            const dockerfile = await aiAgentService.generateDockerfile(repoData, techStack);
            expect(dockerfile).toBeDefined();
            expect(dockerfile).toContain('FROM node:18-alpine');
            expect(dockerfile).toContain('WORKDIR /app');
            expect(dockerfile).toContain('COPY package*.json');
            expect(dockerfile).toContain('RUN npm ci');
            expect(dockerfile).toContain('EXPOSE 3000');
            expect(dockerfile).toContain('CMD');
        });
        it('should generate fallback Dockerfile for React', async () => {
            const repoData = {
                fullName: 'test/react-fallback',
                description: 'React fallback test',
                language: 'JavaScript',
                dependencies: ['react', 'react-dom'],
                devDependencies: [],
                scripts: { build: 'npm run build' },
                packageJson: { name: 'react-test', version: '1.0.0' },
                files: [{ name: 'package.json' }]
            };
            const techStack = ['React'];
            const dockerfile = await aiAgentService.generateDockerfile(repoData, techStack);
            expect(dockerfile).toBeDefined();
            expect(dockerfile).toContain('FROM node:18-alpine AS build');
            expect(dockerfile).toContain('FROM nginx:stable-alpine');
            expect(dockerfile).toContain('COPY --from=build');
        });
    });
    describe('Docker Service Utilities', () => {
        it('should check Docker availability', async () => {
            const isAvailable = await dockerService.isDockerAvailable();
            expect(typeof isAvailable).toBe('boolean');
        });
        it('should list Docker images', async () => {
            const images = await dockerService.listImages();
            expect(Array.isArray(images)).toBe(true);
        });
        it('should get image information', async () => {
            const testDockerfile = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`;
            const generationId = 'test-info-' + Date.now();
            const buildResult = await dockerService.buildImage(testDockerfile, generationId);
            if (buildResult.success && buildResult.imageId) {
                const imageInfo = await dockerService.getImageInfo(buildResult.imageId);
                expect(imageInfo).toBeDefined();
                expect(Array.isArray(imageInfo)).toBe(true);
                expect(imageInfo.length).toBeGreaterThan(0);
            }
        }, 60000);
    });
});
//# sourceMappingURL=dockerfile-integration.test.js.map