# MCP Server Configuration Guide

This guide will help you configure all the MCP servers for your Android development environment.

## Server Overview

Your MCP configuration includes the following servers:

### Core Development Servers
- **filesystem**: File system operations for project management
- **git**: Version control operations
- **sqlite**: Database operations for local development
- **memory**: Context and memory management
- **time**: Time and scheduling utilities
- **fetch**: HTTP requests and API testing
- **sequential-thinking**: Complex problem solving

### DevOps & Deployment
- **docker**: Container operations
- **kubernetes**: Deployment and orchestration
- **sentry**: Error tracking and monitoring

### Search & Research
- **brave-search**: Web search capabilities
- **everything**: Windows file indexing and search

### Web Automation
- **puppeteer**: Browser automation and testing

### Cloud & Integration
- **github**: Repository management
- **postgres**: Database operations
- **slack**: Team communication
- **gdrive**: Cloud storage
- **notion**: Documentation and project management
- **anthropic**: AI assistance

## API Keys Required

Create a `.env` file in your project root with the following keys:

```env
# Web Search
BRAVE_API_KEY=your_brave_api_key_here

# GitHub Integration
GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token_here

# Error Tracking
SENTRY_AUTH_TOKEN=your_sentry_token_here
SENTRY_ORG=your_sentry_org

# Team Communication
SLACK_BOT_TOKEN=your_slack_bot_token_here

# Google Drive
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Documentation
NOTION_API_KEY=your_notion_api_key

# AI Assistance
ANTHROPIC_API_KEY=your_anthropic_api_key

# Database
POSTGRES_CONNECTION_STRING=postgresql://localhost:5432/synapse
```

## How to Get API Keys

### Brave Search API
1. Go to https://api.search.brave.com/app/keys
2. Sign up/login and create a new API key
3. Copy the key to your `.env` file

### GitHub Personal Access Token
1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate a new token with repo and workflow permissions
3. Copy the token to your `.env` file

### Sentry
1. Go to https://sentry.io/settings/account/api/auth-tokens/
2. Create a new auth token
3. Copy the token and organization slug to your `.env` file

### Slack Bot Token
1. Go to https://api.slack.com/apps
2. Create a new app and get the bot token
3. Copy the token to your `.env` file

### Google Drive API
1. Go to Google Cloud Console
2. Enable Google Drive API
3. Create OAuth 2.0 credentials
4. Copy client ID and secret to your `.env` file

### Notion API
1. Go to https://www.notion.so/my-integrations
2. Create a new integration
3. Copy the API key to your `.env` file

### Anthropic API
1. Go to https://console.anthropic.com/
2. Create an API key
3. Copy the key to your `.env` file

## Installation Steps

1. Run the setup script:
   ```cmd
   cd C:\Users\posso\synapse\scripts
   setup-mcp-servers.bat
   ```

2. Create and configure your `.env` file with the API keys above

3. Update the `mcp.json` file to reference your environment variables

4. Restart your IDE to load the new MCP servers

## Testing Your Setup

After configuration, you can test the servers by:
1. Opening GitHub Copilot Chat
2. Asking questions that would utilize the MCP servers
3. Checking the MCP server logs for any connection issues

## Troubleshooting

### Common Issues:
- **Server not starting**: Check if all dependencies are installed
- **API key errors**: Verify your API keys are correct and have proper permissions
- **Path issues**: Ensure all file paths in mcp.json are correct for your system
- **Permission errors**: Run the setup script as administrator if needed

### Log Locations:
- MCP server logs are typically in your IDE's output/console
- Check GitHub Copilot's extension logs for MCP-related errors

## Android Development Specific Benefits

With these MCP servers configured, you'll have enhanced capabilities for:
- **Code Management**: Git operations, file system access
- **Database Operations**: SQLite for local development, PostgreSQL for backend
- **API Testing**: Fetch server for testing your Android app's API calls
- **Error Tracking**: Sentry integration for monitoring your app
- **Documentation**: Notion integration for project documentation
- **Search**: Brave search for researching Android development topics
- **Automation**: Puppeteer for web-based testing and automation
- **Deployment**: Docker and Kubernetes for containerized deployment
