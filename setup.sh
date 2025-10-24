#!/bin/bash

echo "🚀 Setting up DockGen AI Backend"
echo "================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v18 or higher) first."
    exit 1
fi

# Check if MongoDB is running
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB is not installed. Please install MongoDB first."
    echo "   Visit: https://docs.mongodb.com/manual/installation/"
fi

# Check if Docker is running
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
fi

echo "📦 Installing dependencies..."
npm install

echo "🔧 Setting up environment file..."

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp env.example .env
    echo "⚠️  Please update .env with your API keys:"
    echo "   - GEMINI_API_KEY"
    echo "   - MONGODB_URI"
    echo "   - GITHUB_TOKEN"
else
    echo "✅ .env file already exists"
fi

echo "✅ Backend setup complete!"
echo ""
echo "🚀 To start the backend:"
echo "   npm run dev"
echo ""
echo "📚 Make sure to:"
echo "   1. Update .env with your API keys"
echo "   2. Start MongoDB: mongod"
echo "   3. Start Docker: docker --version"
echo ""
echo "🌐 Backend will be available at:"
echo "   http://localhost:3001"
