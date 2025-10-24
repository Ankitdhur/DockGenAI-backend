"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerService = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const DockerfileValidationService_1 = require("./DockerfileValidationService");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class DockerService {
    constructor() {
        this.tempDir = path_1.default.join(process.cwd(), 'temp');
        this.validationService = new DockerfileValidationService_1.DockerfileValidationService();
        this.ensureTempDir();
    }
    async buildImage(dockerfile, generationId, repoData) {
        try {
            const buildId = (0, uuid_1.v4)();
            const buildDir = path_1.default.join(this.tempDir, buildId);
            // Create build directory
            await fs_1.default.promises.mkdir(buildDir, { recursive: true });
            // Validate Dockerfile syntax first
            const validationResult = await this.validationService.validateDockerfile(dockerfile);
            if (!validationResult.isValid) {
                console.log('Dockerfile validation failed, attempting to create a simple fallback Dockerfile...');
                console.log('Validation errors:', validationResult.errors);
                return await this.createFallbackBuild(dockerfile, generationId, repoData);
            }
            // Log warnings and suggestions
            if (validationResult.warnings.length > 0) {
                console.warn('Dockerfile warnings:', validationResult.warnings);
            }
            if (validationResult.suggestions.length > 0) {
                console.info('Dockerfile suggestions:', validationResult.suggestions);
            }
            // Write Dockerfile
            const dockerfilePath = path_1.default.join(buildDir, 'Dockerfile');
            await fs_1.default.promises.writeFile(dockerfilePath, dockerfile);
            // Create .dockerignore to optimize build context
            await this.createDockerignore(buildDir);
            // Create proper package.json based on repository data or defaults
            const packageJsonPath = path_1.default.join(buildDir, 'package.json');
            if (!await this.fileExists(packageJsonPath)) {
                const packageJson = this.createPackageJson(repoData);
                await fs_1.default.promises.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
            }
            // Create proper source files based on repository data or defaults
            await this.createSourceFiles(buildDir, repoData);
            // Build Docker image with better error handling
            const imageName = `dockgen-ai-${generationId}:latest`;
            const buildCommand = `docker build --no-cache --progress=plain -t ${imageName} .`;
            console.log(`Building Docker image: ${buildCommand}`);
            console.log(`Build directory: ${buildDir}`);
            console.log(`Available files:`, await fs_1.default.promises.readdir(buildDir));
            console.log(`🚀 Starting Docker build process for image: ${imageName}`);
            console.log(`⏳ Docker build is now running - this may take several minutes...`);
            // Change to build directory and run docker build
            const { stdout, stderr } = await execAsync(buildCommand, {
                cwd: buildDir,
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
            const { stdout: imagesOutput } = await execAsync(`docker images ${imageName} --format "{{.ID}}"`);
            const imageId = imagesOutput.trim();
            if (!imageId) {
                throw new Error('Docker image was not created successfully');
            }
            // Image created successfully - no need to test/run it
            console.log(`✅ Docker image created successfully: ${imageName}`);
            console.log(`🎉 Docker build completed successfully!`);
            // Clean up build directory
            await this.cleanupBuildDir(buildDir);
            console.log(`🔍 DockerService returning: success=true, imageId=${imageName}`);
            return {
                success: true,
                imageId: imageName
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
    async createFallbackBuild(originalDockerfile, generationId, repoData) {
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
            const buildDir = path_1.default.join(this.tempDir, generationId);
            const dockerfilePath = path_1.default.join(buildDir, 'Dockerfile');
            await fs_1.default.promises.writeFile(dockerfilePath, fallbackDockerfile);
            // Try building with the fallback Dockerfile
            const imageName = `dockgen-ai-${generationId}:latest`;
            const buildCommand = `docker build --no-cache --progress=plain -t ${imageName} .`;
            console.log(`Building with fallback Dockerfile: ${buildCommand}`);
            const { stdout, stderr } = await execAsync(buildCommand, {
                cwd: buildDir,
                timeout: 300000 // 5 minutes timeout
            });
            console.log('Fallback build stdout:', stdout);
            if (stderr) {
                console.error('Fallback build stderr:', stderr);
            }
            // Verify the image was created
            const { stdout: imagesOutput } = await execAsync(`docker images ${imageName} --format "{{.ID}}"`);
            const imageId = imagesOutput.trim();
            if (!imageId) {
                throw new Error('Fallback Docker image was not created successfully');
            }
            console.log(`Fallback build successful! Image ID: ${imageId}`);
            return {
                success: true,
                imageId: imageName
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
    async getImageInfo(imageName) {
        try {
            const { stdout } = await execAsync(`docker inspect ${imageName}`);
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
    async deleteImage(imageName) {
        try {
            await execAsync(`docker rmi ${imageName}`);
            return true;
        }
        catch (error) {
            console.error('Error deleting image:', error);
            return false;
        }
    }
    async ensureTempDir() {
        try {
            await fs_1.default.promises.mkdir(this.tempDir, { recursive: true });
        }
        catch (error) {
            console.error('Error creating temp directory:', error);
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
    async cleanupBuildDir(buildDir) {
        try {
            await fs_1.default.promises.rm(buildDir, { recursive: true, force: true });
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
    async createDockerignore(buildDir) {
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
        const dockerignorePath = path_1.default.join(buildDir, '.dockerignore');
        await fs_1.default.promises.writeFile(dockerignorePath, dockerignoreContent);
    }
    // Create package.json based on repository data
    createPackageJson(repoData) {
        if (repoData?.packageJson) {
            return repoData.packageJson;
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
    async createSourceFiles(buildDir, repoData) {
        // Create index.js
        const indexJsPath = path_1.default.join(buildDir, 'index.js');
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
exports.DockerService = DockerService;
//# sourceMappingURL=DockerService.js.map