"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContainerBuildEngine = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const DockerfileValidationService_1 = require("./DockerfileValidationService");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class ContainerBuildEngine {
    constructor() {
        this.buildDirectory = path_1.default.join(process.cwd(), 'temp');
        this.dockerfileValidator = new DockerfileValidationService_1.DockerfileValidationService();
        this.initializeBuildDirectory();
    }
    async buildImage(dockerfileContent, buildId, repositoryData) {
        try {
            const uniqueBuildId = (0, uuid_1.v4)();
            const buildWorkspace = path_1.default.join(this.buildDirectory, uniqueBuildId);
            // Create build directory
            await fs_1.default.promises.mkdir(buildWorkspace, { recursive: true });
            // Validate Dockerfile syntax first
            const validationResult = await this.dockerfileValidator.validateDockerfile(dockerfileContent);
            if (!validationResult.isValid) {
                console.log('Dockerfile validation failed, attempting to create a simple fallback Dockerfile...');
                console.log('Validation errors:', validationResult.errors);
                return await this.createFallbackBuild(dockerfileContent, buildId, repositoryData);
            }
            // Log warnings and suggestions
            if (validationResult.warnings.length > 0) {
                console.warn('Dockerfile warnings:', validationResult.warnings);
            }
            if (validationResult.suggestions.length > 0) {
                console.info('Dockerfile suggestions:', validationResult.suggestions);
            }
            // Write Dockerfile
            const dockerfilePath = path_1.default.join(buildWorkspace, 'Dockerfile');
            await fs_1.default.promises.writeFile(dockerfilePath, dockerfileContent);
            // Create .dockerignore to optimize build context
            await this.createDockerignore(buildWorkspace);
            // Create proper package.json based on repository data or defaults
            const packageJsonPath = path_1.default.join(buildWorkspace, 'package.json');
            if (!await this.fileExists(packageJsonPath)) {
                const packageJsonData = this.createPackageJson(repositoryData);
                await fs_1.default.promises.writeFile(packageJsonPath, JSON.stringify(packageJsonData, null, 2));
            }
            // Create proper source files based on repository data or defaults
            await this.createSourceFiles(buildWorkspace, repositoryData);
            // Build Docker image with better error handling
            const containerImageName = `dockgen-ai-${buildId}:latest`;
            const buildCommand = `docker build --no-cache --progress=plain -t ${containerImageName} .`;
            console.log(`Building Docker image: ${buildCommand}`);
            console.log(`Build directory: ${buildWorkspace}`);
            console.log(`Available files:`, await fs_1.default.promises.readdir(buildWorkspace));
            console.log(`🚀 Starting Docker build process for image: ${containerImageName}`);
            console.log(`⏳ Docker build is now running - this may take several minutes...`);
            // Change to build directory and run docker build
            const { stdout, stderr } = await execAsync(buildCommand, {
                cwd: buildWorkspace,
                timeout: 300000 // 5 minutes timeout
            });
            console.log('Docker build stdout:', stdout);
            if (stderr) {
                console.error('Docker build stderr:', stderr);
                // Check if it's a critical error
                if (stderr.includes('ERROR') && !stderr.includes('Successfully built')) {
                    throw new Error(`Docker build failed: ${stderr}`);
                }
            }
            // Verify the image was created
            const { stdout: imagesOutput } = await execAsync(`docker images ${containerImageName} --format "{{.ID}}"`);
            const containerImageId = imagesOutput.trim();
            if (!containerImageId) {
                throw new Error('Docker image was not created successfully');
            }
            // Image created successfully - no need to test/run it
            console.log(`✅ Docker image created successfully: ${containerImageName}`);
            console.log(`🎉 Docker build completed successfully!`);
            // Clean up build directory
            await this.cleanupBuildDir(buildWorkspace);
            console.log(`🔍 ContainerBuildEngine returning: success=true, imageId=${containerImageName}`);
            return {
                success: true,
                imageId: containerImageName
            };
        }
        catch (error) {
            console.error('Docker build error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown Docker build error'
            };
        }
    }
    async createFallbackBuild(originalDockerfileContent, buildId, repositoryData) {
        try {
            console.log('Creating fallback Dockerfile...');
            // Create a simple, working Dockerfile
            const fallbackDockerfile = `# Simple Node.js Application
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Expose port (use numeric port, not environment variable)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]`;
            // Write the fallback Dockerfile
            const fallbackBuildDir = path_1.default.join(this.buildDirectory, buildId);
            const dockerfilePath = path_1.default.join(fallbackBuildDir, 'Dockerfile');
            await fs_1.default.promises.writeFile(dockerfilePath, fallbackDockerfile);
            // Try building with the fallback Dockerfile
            const fallbackImageName = `dockgen-ai-${buildId}:latest`;
            const buildCommand = `docker build --no-cache --progress=plain -t ${fallbackImageName} .`;
            console.log(`Building with fallback Dockerfile: ${buildCommand}`);
            const { stdout, stderr } = await execAsync(buildCommand, {
                cwd: fallbackBuildDir,
                timeout: 300000 // 5 minutes timeout
            });
            console.log('Fallback build stdout:', stdout);
            if (stderr) {
                console.error('Fallback build stderr:', stderr);
            }
            // Verify the image was created
            const { stdout: imagesOutput } = await execAsync(`docker images ${fallbackImageName} --format "{{.ID}}"`);
            const fallbackImageId = imagesOutput.trim();
            if (!fallbackImageId) {
                throw new Error('Fallback Docker image was not created successfully');
            }
            console.log(`Fallback build successful! Image ID: ${fallbackImageId}`);
            return {
                success: true,
                imageId: fallbackImageName
            };
        }
        catch (error) {
            console.error('Fallback build also failed:', error);
            return {
                success: false,
                error: `Both original and fallback builds failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async getImageInfo(containerImageName) {
        try {
            const { stdout } = await execAsync(`docker inspect ${containerImageName}`);
            return JSON.parse(stdout);
        }
        catch (error) {
            console.error('Error getting image info:', error);
            return null;
        }
    }
    async listImages() {
        try {
            const { stdout } = await execAsync('docker images --format "{{.Repository}}:{{.Tag}}"');
            return stdout.trim().split('\n').filter(line => line.includes('dockgen-ai'));
        }
        catch (error) {
            console.error('Error listing images:', error);
            return [];
        }
    }
    async deleteImage(containerImageName) {
        try {
            await execAsync(`docker rmi ${containerImageName}`);
            return true;
        }
        catch (error) {
            console.error('Error deleting image:', error);
            return false;
        }
    }
    async initializeBuildDirectory() {
        try {
            await fs_1.default.promises.mkdir(this.buildDirectory, { recursive: true });
        }
        catch (error) {
            console.error('Error creating build directory:', error);
        }
    }
    async fileExists(filePath) {
        try {
            await fs_1.default.promises.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    async cleanupBuildDir(buildWorkspace) {
        try {
            await fs_1.default.promises.rm(buildWorkspace, { recursive: true, force: true });
        }
        catch (error) {
            console.error('Error cleaning up build directory:', error);
        }
    }
    // Health check for Docker daemon
    async isDockerAvailable() {
        try {
            await execAsync('docker --version');
            return true;
        }
        catch (error) {
            console.error('Docker is not available:', error);
            return false;
        }
    }
    // Create .dockerignore file
    async createDockerignore(buildWorkspace) {
        const dockerignoreContent = `node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.git
.gitignore
README.md
.env
.nyc_output
coverage
.nyc_output
.coverage
.cache
.parcel-cache
.next
.nuxt
dist
build
.tmp
.temp
*.log
*.pid
*.seed
*.pid.lock
.DS_Store
Thumbs.db
.vscode
.idea
*.swp
*.swo
*~`;
        const dockerignorePath = path_1.default.join(buildWorkspace, '.dockerignore');
        await fs_1.default.promises.writeFile(dockerignorePath, dockerignoreContent);
    }
    // Create package.json based on repository data
    createPackageJson(repositoryData) {
        if (repositoryData?.packageJson) {
            return repositoryData.packageJson;
        }
        return {
            name: 'dockgen-test',
            version: '1.0.0',
            description: 'Generated by DockGen AI',
            main: 'index.js',
            scripts: {
                start: 'node index.js',
                dev: 'node index.js',
                build: 'echo "Build completed"'
            },
            dependencies: {
                express: '^4.18.2'
            },
            engines: {
                node: '>=18.0.0'
            }
        };
    }
    // Create source files based on repository data
    async createSourceFiles(buildWorkspace, repositoryData) {
        // Create index.js
        const indexJsPath = path_1.default.join(buildWorkspace, 'index.js');
        if (!await this.fileExists(indexJsPath)) {
            const indexJsContent = `const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Hello from DockGen AI!', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(\`Server is running on port \${port}\`);
  console.log(\`Health check available at http://localhost:\${port}/health\`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});`;
            await fs_1.default.promises.writeFile(indexJsPath, indexJsContent);
        }
    }
}
exports.ContainerBuildEngine = ContainerBuildEngine;
//# sourceMappingURL=DockerService.js.map