import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import projectBuildRoutes from './routes/generation';
import { errorHandler } from './utils/errorHandler';

// Load environment variables
dotenv.config();

const application = express();
const SERVER_PORT = process.env.PORT || 3001;

// Middleware
application.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
application.use(express.json());
application.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dockgen')
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Routes
application.use('/api/generation', projectBuildRoutes);

// Health check endpoint
application.get('/health', (request, response) => {
  response.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'DockGen AI Backend'
  });
});

// Error handling middleware
application.use(errorHandler);

// Start server
application.listen(SERVER_PORT, () => {
  console.log(`🚀 DockGen AI Backend running on port ${SERVER_PORT}`);
  console.log(`📊 Health check: http://localhost:${SERVER_PORT}/health`);
  console.log(`🔑 CORS enabled for: https://dock-generator-client.vercel.app, http://localhost:3000`);
});

export default application;
