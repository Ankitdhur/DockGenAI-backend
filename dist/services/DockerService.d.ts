export interface BuildResult {
    success: boolean;
    imageId?: string;
    error?: string;
}
export declare class DockerService {
    private tempDir;
    private validationService;
    constructor();
    buildImage(dockerfile: string, generationId: string, repoData?: any): Promise<BuildResult>;
    private createFallbackBuild;
    getImageInfo(imageName: string): Promise<any>;
    listImages(): Promise<string[]>;
    deleteImage(imageName: string): Promise<boolean>;
    private ensureTempDir;
    private fileExists;
    private cleanupBuildDir;
    isDockerAvailable(): Promise<boolean>;
    private createDockerignore;
    private createPackageJson;
    private createSourceFiles;
}
//# sourceMappingURL=DockerService.d.ts.map