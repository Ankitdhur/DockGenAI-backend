"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const generation_1 = __importDefault(require("./routes/generation"));
const errorHandler_1 = require("./utils/errorHandler");
// Load environment variables
dotenv_1.default.config();
const application = (0, express_1.default)();
const SERVER_PORT = process.env.PORT || 3001;
// Middleware
application.use((0, cors_1.default)({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
application.use(express_1.default.json());
application.use(express_1.default.urlencoded({ extended: true }));
// Connect to MongoDB
mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dockgen')
    .then(() => {
    console.log('✅ Connected to MongoDB');
})
    .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
});
// Routes
application.use('/api/generation', generation_1.default);
// Health check endpoint
application.get('/health', (request, response) => {
    response.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'DockGen AI Backend'
    });
});
// Error handling middleware
application.use(errorHandler_1.errorHandler);
// Start server
application.listen(SERVER_PORT, () => {
    console.log(`🚀 DockGen AI Backend running on port ${SERVER_PORT}`);
    console.log(`📊 Health check: http://localhost:${SERVER_PORT}/health`);
    console.log(`🔑 CORS enabled for: https://dock-generator-client.vercel.app, http://localhost:3000`);
});
exports.default = application;
//# sourceMappingURL=index.js.map