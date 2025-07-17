# Synapse - AI Development Hub

Synapse is an intelligent development and creation hub that leverages advanced Agent-to-Agent (A2A) communication to enable users to collaborate with multiple AI models for software development, content generation, and professional documentation.

## Architecture Overview

- **Frontend**: Android app (Kotlin + Jetpack Compose)
- **Backend**: Node.js/Express API with PostgreSQL and Redis
- **AI Integration**: OpenAI GPT, Anthropic Claude, Google Gemini
- **Deployment**: Phased approach from local → Railway/Supabase → Vercel/PlanetScale → GCP

## Quick Start (Local Development)

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for backend development)
- Android Studio with Kotlin support (for mobile app development)
- JDK 8 or higher (for Android development)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd synapse
cp .env.example .env
```

### 2. Start Local Development Environment

```bash
# Start all services (PostgreSQL, Redis, Backend API)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### 3. Access Services

- **Backend API**: http://localhost:3000
- **API Health Check**: http://localhost:3000/health
- **PostgreSQL**: localhost:5432 (synapse_dev/synapse_user)
- **Redis**: localhost:6379
- **PgAdmin** (optional): http://localhost:5050 (dev@synapse.local/dev_password)

To start PgAdmin: `docker-compose --profile tools up -d`

### 4. Environment Variables

Add your AI API keys to `.env`:

```bash
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
GOOGLE_API_KEY=your-google-key
```

### 5. Android Development

Open the Android project in Android Studio:

```bash
# Open Android Studio and import project
# File -> Open -> select /synapse/android folder

# Or from command line (if you have Android Studio CLI tools)
studio android/
```

**Android Project Structure:**
- **Clean Architecture**: Domain/Data/UI layers
- **Jetpack Compose**: Modern declarative UI
- **Hilt**: Dependency injection
- **Retrofit**: API communication
- **Material 3**: Design system

## API Documentation

### Authentication

```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","displayName":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Projects

```bash
# Create project (requires auth token)
curl -X POST http://localhost:3000/api/v1/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"My App","projectType":"android_app","description":"A cool Android app"}'

# Get projects
curl -X GET http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### AI Interaction

```bash
# Create AI session
curl -X POST http://localhost:3000/api/v1/ai/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"projectId":"PROJECT_ID","agents":["code_conjurer","architectrix"]}'

# Send message to AI
curl -X POST http://localhost:3000/api/v1/ai/sessions/SESSION_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message":"Create a user authentication component","messageType":"user_input"}'
```

## Development Workflow

### Backend Development

```bash
# Install dependencies
cd backend
npm install

# Run in development mode (with auto-reload)
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

### Database Management

```bash
# Run migrations (when implemented)
npm run migrate

# Seed database (when implemented)
npm run seed
```

## Project Structure

```
synapse/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Custom middleware
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── utils/           # Helper functions
│   └── tests/               # Backend tests
├── android/                 # Android app (Kotlin + Jetpack Compose)
│   ├── app/src/main/java/com/synapse/app/
│   │   ├── ui/              # Compose UI screens
│   │   ├── data/            # API & local data
│   │   ├── domain/          # Business models
│   │   └── di/              # Dependency injection
│   └── app/build.gradle.kts # Android build config
├── database/                # Database scripts
├── docker-compose.yml       # Local development setup
└── README.md
```

## Available Agents

- **Architectrix**: System architecture and design specialist
- **Code Conjurer**: Code generation and implementation expert
- **UI Designer**: User interface and experience designer

## Available AI Models

- **GPT-4**: Advanced reasoning and code generation
- **GPT-3.5 Turbo**: Fast and efficient text/code generation
- **Claude 3 Sonnet**: High-quality analysis and code generation

## Development Phases

### Phase 1: Local Development ✅ *Current*
- Docker Compose setup
- Basic API endpoints
- In-memory data storage
- Mock AI responses

### Phase 2: MVP Deployment (Weeks 5-12)
- Deploy to Railway + Supabase
- Real AI model integration
- User testing and feedback

### Phase 3: Beta Testing (Weeks 13-24)
- Scale with Vercel + PlanetScale
- Advanced features
- Performance optimization

### Phase 4: Production (Weeks 25+)
- Full GCP deployment
- Enterprise features
- Monitoring and analytics

## Contributing

1. Create feature branch from `develop`
2. Make changes and test locally
3. Run linting and tests
4. Submit pull request

## Troubleshooting

### Docker Issues
```bash
# Reset Docker environment
docker-compose down -v
docker-compose up -d

# View service logs
docker-compose logs backend
docker-compose logs postgres
```

### API Issues
```bash
# Check backend health
curl http://localhost:3000/health

# View backend logs
docker-compose logs -f backend
```

### Database Issues
```bash
# Connect to PostgreSQL
docker exec -it synapse_postgres psql -U synapse_user -d synapse_dev

# Reset database
docker-compose down -v postgres
docker-compose up -d postgres
```

## License

MIT License - see LICENSE file for details.