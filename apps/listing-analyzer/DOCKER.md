# Docker Setup for Listing Analyzer

## Overview
The Listing Analyzer app runs in its own Docker container on port 9004, avoiding conflicts with other services in the monorepo.

## Port Allocation
- **9002**: Main cleaning calendar app
- **9003**: Analytics platform
- **9004**: Listing Analyzer (this app)
- **5433**: PostgreSQL (shared)

## Quick Start

### Using npm scripts from root directory:
```bash
# Build the Docker image
npm run analyzer:docker:build

# Start the container
npm run analyzer:docker

# View logs
npm run analyzer:docker:logs

# Stop the container
npm run analyzer:docker:down
```

### Using docker-compose directly:
```bash
cd apps/listing-analyzer

# Start with build
docker-compose up --build

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Environment Variables
The container uses environment variables from:
1. `../../.env.local` (root directory)
2. Environment section in docker-compose.yml
3. System environment variables

Required variables:
- `BROWSERLESS_API_KEY`: For web scraping
- `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY`: For AI analysis
- `NEXT_PUBLIC_ANALYTICS_URL`: Link to analytics app (default: http://localhost:9003)

## Development Workflow

1. **Initial Setup**:
   ```bash
   # From root directory
   npm run analyzer:docker:build
   ```

2. **Start Development**:
   ```bash
   npm run analyzer:docker
   ```

3. **Access the App**:
   - Open http://localhost:9004

4. **Hot Reload**:
   - Code changes are automatically reflected due to volume mounts
   - The container watches for file changes and reloads

5. **View Logs**:
   ```bash
   npm run analyzer:docker:logs
   ```

6. **Stop Development**:
   ```bash
   npm run analyzer:docker:down
   ```

## Production Build

To build for production:
```bash
docker-compose -f apps/listing-analyzer/docker-compose.yml build --build-arg target=production
```

## Health Check
The container includes a health check endpoint at `/api/health` that returns:
```json
{
  "status": "healthy",
  "service": "listing-analyzer",
  "timestamp": "2025-08-09T..."
}
```

## Troubleshooting

### Port Already in Use
If port 9004 is already in use:
```bash
# Find the process using the port
lsof -i :9004

# Kill the process
kill -9 <PID>
```

### Container Won't Start
Check logs for errors:
```bash
npm run analyzer:docker:logs
```

### Environment Variables Not Loading
Ensure `.env.local` exists in the root directory with required variables:
```env
BROWSERLESS_API_KEY=your-key-here
GEMINI_API_KEY=your-key-here
```

### Network Issues
The container uses its own network (`listing-analyzer-network`) to avoid conflicts. If you need to connect to other services, you may need to adjust the network configuration.

## Docker Commands Reference

```bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# Remove container
docker rm listing-analyzer

# Remove image
docker rmi listing-analyzer

# Clean up unused resources
docker system prune -a
```