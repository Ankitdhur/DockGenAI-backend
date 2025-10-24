import mongoose, { Document } from 'mongoose';
export interface IGeneration extends Document {
    githubUrl: string;
    githubToken: string;
    techStack: string[];
    dockerfile: string;
    buildStatus: 'pending' | 'building' | 'success' | 'error';
    imageId?: string;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Generation: mongoose.Model<IGeneration, {}, {}, {}, mongoose.Document<unknown, {}, IGeneration, {}, {}> & IGeneration & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Generation.d.ts.map