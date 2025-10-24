export interface BuildResult {
    success: boolean;
    imageId?: string;
    error?: string;
}
export declare class ContainerBuildEngine {
    private buildDirectory;
    private dockerfileValidator;
    constructor();
    buildImage(dockerfileContent: string, buildId: string, repositoryData?: any): Promise<BuildResult>;
    private createFallbackBuild;
    getImageInfo(containerImageName: string): Promise<any>;
    listImages(): Promise<string[]>;
    deleteImage(containerImageName: string): Promise<boolean>;
    private initializeBuildDirectory;
    private fileExists;
    private cleanupBuildDir;
    isDockerAvailable(): Promise<boolean>;
    private createDockerignore;
    private createPackageJson;
    private createSourceFiles;
}
//# sourceMappingURL=DockerService.d.ts.map