import mongoose, { Document, Schema } from 'mongoose';

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

const ProjectBuildSchema = new Schema<IProjectBuild>({
  repositoryUrl: {
    type: String,
    required: true,
    trim: true
  },
  accessToken: {
    type: String,
    required: true,
    trim: true
  },
  detectedTechnologies: [{
    type: String,
    trim: true
  }],
  generatedDockerfile: {
    type: String,
    default: ''
  },
  processingState: {
    type: String,
    enum: ['queued', 'analyzing', 'completed', 'failed'],
    default: 'queued'
  },
  containerImageId: {
    type: String,
    trim: true
  },
  failureReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for better query performance
ProjectBuildSchema.index({ repositoryUrl: 1, createdAt: -1 });

export const ProjectBuild = mongoose.model<IProjectBuild>('ProjectBuild', ProjectBuildSchema);
