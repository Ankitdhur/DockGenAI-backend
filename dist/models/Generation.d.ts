import mongoose, { Document } from 'mongoose';
export interface IProjectBuild extends Document {
    repositoryUrl: string;
    accessToken: string;
    detectedTechnologies: string[];
    generatedDockerfile: string;
    processingState: 'queued' | 'analyzing' | 'completed' | 'failed';
    containerImageId?: string;
    failureReason?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ProjectBuild: mongoose.Model<IProjectBuild, {}, {}, {}, mongoose.Document<unknown, {}, IProjectBuild, {}, {}> & IProjectBuild & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Generation.d.ts.map