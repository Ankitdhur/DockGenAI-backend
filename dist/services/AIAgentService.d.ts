import { RepositoryData } from './GitHubService';
export declare class IntelligentAnalysisEngine {
    private languageModel;
    constructor();
    analyzeProjectTechnologies(repoData: RepositoryData): Promise<string[]>;
    createContainerConfiguration(repoData: RepositoryData, detectedTechnologies: string[]): Promise<string>;
    private extractTechnologyNames;
    private performBasicTechnologyDetection;
    private containsInvalidDockerSyntax;
    private createFallbackContainerConfiguration;
    private sanitizeDockerfileContent;
}
//# sourceMappingURL=AIAgentService.d.ts.map