export interface RepositoryData {
    name: string;
    fullName: string;
    description: string;
    language: string;
    defaultBranch: string;
    files: {
        name: string;
        path: string;
        content: string;
        type: 'file' | 'dir';
    }[];
    packageJson?: any;
    dependencies?: string[];
    devDependencies?: string[];
    scripts?: {
        [key: string]: string;
    };
}
export declare class GitHubService {
    private token;
    private baseUrl;
    constructor(token: string);
    fetchRepository(githubUrl: string): Promise<RepositoryData>;
    createFallbackRepositoryData(githubUrl: string): Promise<RepositoryData>;
    pushDockerfileToRepository(githubUrl: string, dockerfile: string, commitMessage?: string): Promise<boolean>;
    private processRepositoryFiles;
}
//# sourceMappingURL=GitHubService.d.ts.map