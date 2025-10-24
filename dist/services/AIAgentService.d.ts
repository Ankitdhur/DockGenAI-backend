import { RepositoryData } from './GitHubService';
export declare class AIAgentService {
    private chatModel;
    constructor();
    detectTechStack(repoData: RepositoryData): Promise<string[]>;
    generateDockerfile(repoData: RepositoryData, techStack: string[]): Promise<string>;
    private parseTechStackResponse;
    private fallbackTechStackDetection;
    private hasInvalidDockerSyntax;
    private generateFallbackDockerfile;
    private cleanDockerfile;
}
//# sourceMappingURL=AIAgentService.d.ts.map