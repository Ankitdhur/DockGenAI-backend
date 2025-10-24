export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
}
export declare class DockerfileValidationService {
    validateDockerfile(dockerfile: string): Promise<ValidationResult>;
    private validateSyntax;
    private validateSecurity;
    private validateBestPractices;
    private validatePerformance;
    validateWithDockerLint(dockerfile: string): Promise<ValidationResult>;
    private getHadolintSeverity;
}
//# sourceMappingURL=DockerfileValidationService.d.ts.map