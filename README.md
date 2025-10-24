# DockGen AI Backend

AI-Powered Dockerfile Generator Backend API

## 🚀 Features

- 🤖 **AI-powered Dockerfile generation** for JavaScript frameworks (React, Next.js, Vue, Angular)
- 🐳 **Automatic Docker image building** with real Docker commands
- 🔍 **GitHub repository analysis** and tech stack detection
- 📝 **Syntax validation** and error handling
- 📊 **Real-time progress tracking** with status updates
- 💾 **Generation history** and result management

## 🛠️ Tech Stack

- **Backend:** Node.js + Express.js + TypeScript
- **Database:** MongoDB + Mongoose
- **AI Agent:** Google Gemini 2.0 Flash + LangChain.js ReAct Agent
- **Containerization:** Docker + Docker API

## ⚡ Quick Start

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (running locally or cloud)
- Docker (for building images)
- Google Gemini API key
- GitHub Personal Access Token

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Environment Configuration

Create a `.env` file in the backend directory:

```bash
# Google Gemini Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/dockgen

# GitHub Configuration
GITHUB_TOKEN=your_github_token_here

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🔧 API Endpoints

### Generation
- `POST /api/generation/generate` - Start Dockerfile generation
- `GET /api/generation/status/:id` - Get generation status
- `GET /api/generation/history` - Get generation history
- `POST /api/generation/push-dockerfile` - Push Dockerfile to repository

### Health
- `GET /health` - Backend health check

## 🏗️ Architecture

### Backend (Express.js)
- **RESTful API** with TypeScript
- **MongoDB integration** with Mongoose
- **GitHub API integration** for repository fetching
- **Google Gemini 2.0 Flash** for AI-powered analysis
- **Docker API integration** for image building
- **Error handling** and logging

### AI Agent Workflow
1. **Repository Analysis** - Fetch and analyze GitHub repository
2. **Tech Stack Detection** - Identify frameworks and dependencies
3. **Dockerfile Generation** - Create optimized Dockerfile
4. **Image Building** - Build actual Docker image
5. **Result Storage** - Save results to database

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables (Production)
```bash
GEMINI_API_KEY=your_production_gemini_key
MONGODB_URI=your_production_mongodb_uri
GITHUB_TOKEN=your_github_token
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
```

## 📊 Monitoring

- **Health checks** at `/health` endpoint
- **Generation status** tracking
- **Error logging** and debugging
- **Performance metrics** for AI operations

## 🔒 Security

- **GitHub token validation**
- **CORS configuration**
- **Input sanitization**
- **Error message sanitization**
- **Rate limiting** (recommended for production)

## 🧪 Testing

```bash
# Test backend API
curl http://localhost:3001/health

# Test generation endpoint
curl -X POST http://localhost:3001/api/generation/generate \
  -H "Content-Type: application/json" \
  -d '{"githubUrl":"https://github.com/username/repo","githubToken":"your_token"}'
```

## 📝 Development

### Adding New Features
1. **Routes:** Add routes in `src/routes/`
2. **Services:** Add business logic in `src/services/`
3. **Models:** Add database models in `src/models/`

### Code Style
- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for code formatting
- **Conventional commits** for version control
