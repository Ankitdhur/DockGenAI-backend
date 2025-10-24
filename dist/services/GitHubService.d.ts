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
export declare class RepositoryDataProvider {
    private authenticationToken;
    private apiEndpoint;
    constructor(authenticationToken: string);
    retrieveRepositoryInformation(repositoryUrl: string): Promise<RepositoryData>;
    generateFallbackRepositoryData(repositoryUrl: string): Promise<RepositoryData>;
    commitDockerfileToRepository(repositoryUrl: string, dockerfileContent: string, commitMessage?: string): Promise<boolean>;
    private processRepositoryFiles;
}
//# sourceMappingURL=GitHubService.d.ts.map