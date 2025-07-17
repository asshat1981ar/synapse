#!/bin/bash

# Synapse Development Environment Startup Script

set -e

echo "🚀 Starting Synapse Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please add your AI API keys to .env"
fi

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up -d --build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build and start services. Exiting."
    exit 1
fi
echo "✅ Services started."

# Wait for backend service to be healthy before running migrations and seeds
echo "⏳ Waiting for backend service to be healthy..."
docker-compose exec backend /bin/sh -c "while ! curl -s http://localhost:3000/health; do sleep 1; done"
if [ $? -ne 0 ]; then
    echo "❌ Backend service did not become healthy. Exiting."
    exit 1
fi
echo "✅ Backend service is healthy."

# Run database migrations and seeds
echo "🌱 Running database migrations and seeds..."
docker-compose exec backend npm run db:setup
if [ $? -ne 0 ]; then
    echo "❌ Database setup failed. Exiting."
    exit 1
fi
echo "✅ Database setup completed."

# View logs
echo "📄 Streaming backend logs..."
docker-compose logs -f backend

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🏥 Checking service health..."

# Check PostgreSQL
if docker-compose exec -T postgres pg_isready -U synapse_user -d synapse_dev > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "❌ PostgreSQL is not ready"
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is ready"
else
    echo "❌ Redis is not ready"
fi

# Check Backend API
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend API is ready"
else
    echo "❌ Backend API is not ready"
    echo "🔍 Backend logs:"
    docker-compose logs --tail=20 backend
fi

echo ""
echo "🎉 Synapse Development Environment is ready!"
echo ""
echo "📊 Service URLs:"
echo "   Backend API: http://localhost:3000"
echo "   Health Check: http://localhost:3000/health"
echo "   PostgreSQL: localhost:5432"
echo "   Redis: localhost:6379"
echo ""
echo "🔧 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart: docker-compose restart"
echo "   Reset data: docker-compose down -v && docker-compose up -d"
echo ""
echo "📚 API Documentation: See README.md for API examples"