"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoryDataProvider = void 0;
const axios_1 = __importDefault(require("axios"));
class RepositoryDataProvider {
    constructor(authenticationToken) {
        this.apiEndpoint = 'https://api.github.com';
        this.authenticationToken = authenticationToken;
    }
    async retrieveRepositoryInformation(repositoryUrl) {
        try {
            // Extract owner and repo from URL
            const urlParts = repositoryUrl.replace('https://github.com/', '').split('/');
            const repositoryOwner = urlParts[0];
            const repositoryName = urlParts[1];
            if (!repositoryOwner || !repositoryName) {
                throw new Error('Invalid GitHub URL format');
            }
            // Fetch repository information
            const repositoryResponse = await axios_1.default.get(`${this.apiEndpoint}/repos/${repositoryOwner}/${repositoryName}`, {
                headers: {
                    'Authorization': `token ${this.authenticationToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            const repositoryData = repositoryResponse.data;
            // Fetch repository contents
            const contentsResponse = await axios_1.default.get(`${this.apiEndpoint}/repos/${repositoryOwner}/${repositoryName}/contents`, {
                headers: {
                    'Authorization': `token ${this.authenticationToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            // Process files and fetch important ones
            const repositoryFiles = await this.processRepositoryFiles(repositoryOwner, repositoryName, contentsResponse.data);
            // Extract package.json if it exists
            const packageJsonFile = repositoryFiles.find(file => file.name === 'package.json');
            let packageJsonData = null;
            let projectDependencies = [];
            let developmentDependencies = [];
            let npmScripts = {};
            if (packageJsonFile) {
                try {
                    // Handle both string and object content
                    const fileContent = typeof packageJsonFile.content === 'string'
                        ? packageJsonFile.content
                        : JSON.stringify(packageJsonFile.content);
                    packageJsonData = JSON.parse(fileContent);
                    projectDependencies = Object.keys(packageJsonData.dependencies || {});
                    developmentDependencies = Object.keys(packageJsonData.devDependencies || {});
                    npmScripts = packageJsonData.scripts || {};
                }
                catch (error) {
                    console.warn('Failed to parse package.json:', error);
                }
            }
            return {
                name: repositoryData.name,
                fullName: repositoryData.full_name,
                description: repositoryData.description || '',
                language: repositoryData.language || 'JavaScript',
                defaultBranch: repositoryData.default_branch,
                files: repositoryFiles,
                packageJson: packageJsonData,
                dependencies: projectDependencies,
                devDependencies: developmentDependencies,
                scripts: npmScripts
            };
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                if (error.response?.status === 404) {
                    throw new Error('Repository not found or access denied');
                }
                else if (error.response?.status === 401) {
                    throw new Error('Invalid GitHub token');
                }
            }
            throw new Error(`Failed to fetch repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    // Fallback method for when GitHub access fails
    async generateFallbackRepositoryData(repositoryUrl) {
        console.log('Creating fallback repository data for:', repositoryUrl);
        // Extract basic info from URL
        const urlParts = repositoryUrl.replace('https://github.com/', '').split('/');
        const repositoryOwner = urlParts[0];
        const repositoryName = urlParts[1];
        // Create a basic package.json for common Node.js projects
        const fallbackPackageJsonData = {
            name: repositoryName || 'app',
            version: '1.0.0',
            description: 'Generated application',
            main: 'index.js',
            scripts: {
                start: 'node index.js',
                dev: 'node index.js'
            },
            dependencies: {
                'express': '^4.18.0'
            },
            devDependencies: {
                'nodemon': '^2.0.0'
            }
        };
        return {
            name: repositoryName || 'app',
            fullName: `${repositoryOwner}/${repositoryName}`,
            description: 'Fallback repository data',
            language: 'JavaScript',
            defaultBranch: 'main',
            dependencies: ['express'],
            devDependencies: ['nodemon'],
            scripts: {
                start: 'node index.js',
                dev: 'node index.js'
            },
            packageJson: fallbackPackageJsonData,
            files: [
                { name: 'package.json', path: 'package.json', content: JSON.stringify(fallbackPackageJsonData, null, 2), type: 'file' },
                { name: 'index.js', path: 'index.js', content: 'console.log("Hello World");', type: 'file' }
            ]
        };
    }
    async commitDockerfileToRepository(repositoryUrl, dockerfileContent, commitMessage = 'Add Dockerfile generated by DockGen AI') {
        try {
            // Extract owner and repo from URL
            const urlParts = repositoryUrl.replace('https://github.com/', '').split('/');
            const repositoryOwner = urlParts[0];
            const repositoryName = urlParts[1];
            if (!repositoryOwner || !repositoryName) {
                throw new Error('Invalid GitHub URL format');
            }
            // Check if Dockerfile already exists
            let existingDockerfile = null;
            try {
                const existingResponse = await axios_1.default.get(`${this.apiEndpoint}/repos/${repositoryOwner}/${repositoryName}/contents/Dockerfile`, {
                    headers: {
                        'Authorization': `token ${this.authenticationToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                existingDockerfile = existingResponse.data;
            }
            catch (error) {
                // File doesn't exist, that's fine
            }
            // Prepare the content
            const encodedContent = Buffer.from(dockerfileContent).toString('base64');
            const commitRequestBody = {
                message: commitMessage,
                content: encodedContent,
                branch: 'main' // Default to main branch
            };
            // If file exists, include the SHA for update
            if (existingDockerfile) {
                commitRequestBody.sha = existingDockerfile.sha;
            }
            // Push the Dockerfile
            const response = await axios_1.default.put(`${this.apiEndpoint}/repos/${repositoryOwner}/${repositoryName}/contents/Dockerfile`, commitRequestBody, {
                headers: {
                    'Authorization': `token ${this.authenticationToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            return response.status === 200 || response.status === 201;
        }
        catch (error) {
            console.error('Error pushing Dockerfile to repository:', error);
            if (axios_1.default.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    throw new Error('Invalid GitHub token or insufficient permissions');
                }
                else if (error.response?.status === 403) {
                    throw new Error('Repository access denied or token lacks write permissions');
                }
            }
            throw new Error(`Failed to push Dockerfile: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async processRepositoryFiles(repositoryOwner, repositoryName, repositoryContents) {
        const repositoryFiles = [];
        for (const item of repositoryContents) {
            if (item.type === 'file') {
                // Only fetch important files to avoid rate limits
                const importantFiles = [
                    'package.json',
                    'package-lock.json',
                    'yarn.lock',
                    'Dockerfile',
                    'docker-compose.yml',
                    'README.md',
                    'index.js',
                    'index.ts',
                    'app.js',
                    'app.ts',
                    'server.js',
                    'server.ts',
                    'main.js',
                    'main.ts'
                ];
                if (importantFiles.includes(item.name) || item.name.endsWith('.json') || item.name.endsWith('.js') || item.name.endsWith('.ts')) {
                    try {
                        const fileResponse = await axios_1.default.get(item.download_url, {
                            headers: {
                                'Authorization': `token ${this.authenticationToken}`,
                                'Accept': 'application/vnd.github.v3+json'
                            }
                        });
                        repositoryFiles.push({
                            name: item.name,
                            path: item.path,
                            content: fileResponse.data,
                            type: 'file'
                        });
                    }
                    catch (error) {
                        console.warn(`Failed to fetch file ${item.name}:`, error);
                    }
                }
            }
            else if (item.type === 'dir') {
                // Recursively process subdirectories (limit depth to avoid infinite recursion)
                if (item.path.split('/').length <= 3) { // Limit to 2 levels deep
                    try {
                        const dirResponse = await axios_1.default.get(`${this.apiEndpoint}/repos/${repositoryOwner}/${repositoryName}/contents/${item.path}`, {
                            headers: {
                                'Authorization': `token ${this.authenticationToken}`,
                                'Accept': 'application/vnd.github.v3+json'
                            }
                        });
                        const subFiles = await this.processRepositoryFiles(repositoryOwner, repositoryName, dirResponse.data);
                        repositoryFiles.push(...subFiles);
                    }
                    catch (error) {
                        console.warn(`Failed to fetch directory ${item.path}:`, error);
                    }
                }
            }
        }
        return repositoryFiles;
    }
}
exports.RepositoryDataProvider = RepositoryDataProvider;
//# sourceMappingURL=GitHubService.js.map