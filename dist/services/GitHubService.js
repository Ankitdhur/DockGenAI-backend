"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubService = void 0;
const axios_1 = __importDefault(require("axios"));
class GitHubService {
    constructor(token) {
        this.baseUrl = 'https://api.github.com';
        this.token = token;
    }
    async fetchRepository(githubUrl) {
        try {
            // Extract owner and repo from URL
            const urlParts = githubUrl.replace('https://github.com/', '').split('/');
            const owner = urlParts[0];
            const repo = urlParts[1];
            if (!owner || !repo) {
                throw new Error('Invalid GitHub URL format');
            }
            // Fetch repository information
            const repoResponse = await axios_1.default.get(`${this.baseUrl}/repos/${owner}/${repo}`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            const repoData = repoResponse.data;
            // Fetch repository contents
            const contentsResponse = await axios_1.default.get(`${this.baseUrl}/repos/${owner}/${repo}/contents`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            // Process files and fetch important ones
            const files = await this.processRepositoryFiles(owner, repo, contentsResponse.data);
            // Extract package.json if it exists
            const packageJsonFile = files.find(file => file.name === 'package.json');
            let packageJson = null;
            let dependencies = [];
            let devDependencies = [];
            let scripts = {};
            if (packageJsonFile) {
                try {
                    // Handle both string and object content
                    const content = typeof packageJsonFile.content === 'string'
                        ? packageJsonFile.content
                        : JSON.stringify(packageJsonFile.content);
                    packageJson = JSON.parse(content);
                    dependencies = Object.keys(packageJson.dependencies || {});
                    devDependencies = Object.keys(packageJson.devDependencies || {});
                    scripts = packageJson.scripts || {};
                }
                catch (error) {
                    console.warn('Failed to parse package.json:', error);
                }
            }
            return {
                name: repoData.name,
                fullName: repoData.full_name,
                description: repoData.description || '',
                language: repoData.language || 'JavaScript',
                defaultBranch: repoData.default_branch,
                files,
                packageJson,
                dependencies,
                devDependencies,
                scripts
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
    async createFallbackRepositoryData(githubUrl) {
        console.log('Creating fallback repository data for:', githubUrl);
        // Extract basic info from URL
        const urlParts = githubUrl.replace('https://github.com/', '').split('/');
        const owner = urlParts[0];
        const repo = urlParts[1];
        // Create a basic package.json for common Node.js projects
        const fallbackPackageJson = {
            name: repo || 'app',
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
            name: repo || 'app',
            fullName: `${owner}/${repo}`,
            description: 'Fallback repository data',
            language: 'JavaScript',
            defaultBranch: 'main',
            dependencies: ['express'],
            devDependencies: ['nodemon'],
            scripts: {
                start: 'node index.js',
                dev: 'node index.js'
            },
            packageJson: fallbackPackageJson,
            files: [
                { name: 'package.json', path: 'package.json', content: JSON.stringify(fallbackPackageJson, null, 2), type: 'file' },
                { name: 'index.js', path: 'index.js', content: 'console.log("Hello World");', type: 'file' }
            ]
        };
    }
    async pushDockerfileToRepository(githubUrl, dockerfile, commitMessage = 'Add Dockerfile generated by DockGen AI') {
        try {
            // Extract owner and repo from URL
            const urlParts = githubUrl.replace('https://github.com/', '').split('/');
            const owner = urlParts[0];
            const repo = urlParts[1];
            if (!owner || !repo) {
                throw new Error('Invalid GitHub URL format');
            }
            // Check if Dockerfile already exists
            let existingFile = null;
            try {
                const existingResponse = await axios_1.default.get(`${this.baseUrl}/repos/${owner}/${repo}/contents/Dockerfile`, {
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                existingFile = existingResponse.data;
            }
            catch (error) {
                // File doesn't exist, that's fine
            }
            // Prepare the content
            const content = Buffer.from(dockerfile).toString('base64');
            const requestBody = {
                message: commitMessage,
                content: content,
                branch: 'main' // Default to main branch
            };
            // If file exists, include the SHA for update
            if (existingFile) {
                requestBody.sha = existingFile.sha;
            }
            // Push the Dockerfile
            const response = await axios_1.default.put(`${this.baseUrl}/repos/${owner}/${repo}/contents/Dockerfile`, requestBody, {
                headers: {
                    'Authorization': `token ${this.token}`,
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
    async processRepositoryFiles(owner, repo, contents) {
        const files = [];
        for (const item of contents) {
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
                                'Authorization': `token ${this.token}`,
                                'Accept': 'application/vnd.github.v3+json'
                            }
                        });
                        files.push({
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
                        const dirResponse = await axios_1.default.get(`${this.baseUrl}/repos/${owner}/${repo}/contents/${item.path}`, {
                            headers: {
                                'Authorization': `token ${this.token}`,
                                'Accept': 'application/vnd.github.v3+json'
                            }
                        });
                        const subFiles = await this.processRepositoryFiles(owner, repo, dirResponse.data);
                        files.push(...subFiles);
                    }
                    catch (error) {
                        console.warn(`Failed to fetch directory ${item.path}:`, error);
                    }
                }
            }
        }
        return files;
    }
}
exports.GitHubService = GitHubService;
//# sourceMappingURL=GitHubService.js.map