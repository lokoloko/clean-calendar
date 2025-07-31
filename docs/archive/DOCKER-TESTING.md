# Docker Testing & Monitoring Guide

This guide explains how to run and monitor tests within Docker containers for the CleanSweep Scheduler application.

## Quick Start

```bash
# Run simple smoke tests with monitoring
./scripts/docker-test-monitor.sh --simple --watch

# Run full test suite
./scripts/docker-test-monitor.sh --full --clean

# View test dashboard
./scripts/test-dashboard.sh

# Monitor logs in real-time
./scripts/monitor-logs.sh both
```

## Test Architecture

### Docker Containers

1. **Test Database** (`cleansweep-test-db`)
   - PostgreSQL 16 Alpine
   - Port: 5434
   - Includes all migrations
   - Isolated test data

2. **Test Runner** (`cleansweep-test-runner`)
   - Node.js 20 Alpine
   - Runs Jest tests
   - Mounts source code
   - Hot reload enabled

### Test Types

1. **Unit Tests** - Component and function tests
2. **Integration Tests** - Database and API tests
3. **E2E Tests** - Full user workflow tests
4. **Smoke Tests** - Quick validation tests

## Scripts Overview

### 1. `docker-test-monitor.sh`

Main test runner with options:

```bash
./scripts/docker-test-monitor.sh [options]

Options:
  -s, --simple     Run simple smoke tests only
  -f, --full       Run full test suite
  -w, --watch      Watch logs in real-time
  -c, --clean      Clean up containers after tests
  -h, --help       Show help message
```

**Features:**
- Automated database setup
- Migration runner
- Real-time log monitoring
- Color-coded output
- Test result summary

### 2. `test-dashboard.sh`

Interactive dashboard showing:
- Docker environment status
- Database connection status
- Test suite results
- Performance metrics
- Coverage reports

```bash
./scripts/test-dashboard.sh
```

### 3. `monitor-logs.sh`

Real-time log viewer with syntax highlighting:

```bash
# Monitor specific logs
./scripts/monitor-logs.sh app    # Application logs only
./scripts/monitor-logs.sh db     # Database logs only
./scripts/monitor-logs.sh both   # Both logs side-by-side
```

**Log Color Coding:**
- 🔴 Red: Errors and failures
- 🟡 Yellow: Warnings
- 🟢 Green: Success and passed tests
- 🔵 Blue: Info and general logs
- 🟣 Purple: Test suites

## Docker Compose Files

### `docker-compose.test-simple.yml`
- Minimal setup for quick tests
- Runs smoke tests only
- Fast startup time

### `docker-compose.test-with-logs.yml`
- Full test environment
- Includes Dozzle log viewer
- Comprehensive logging
- All test suites

## Running Tests

### 1. Quick Smoke Test

```bash
# Simple test to verify setup
./scripts/docker-test-monitor.sh --simple
```

Output:
```
🧪 Running tests...
✅ Smoke Tests PASSED
  Test Suites: 1 passed, 1 total
  Tests:       3 passed, 3 total
  Time:        0.779 s
```

### 2. Full Test Suite

```bash
# Run all tests with cleanup
./scripts/docker-test-monitor.sh --full --clean
```

### 3. Watch Mode

```bash
# Run tests and monitor logs
./scripts/docker-test-monitor.sh --simple --watch
```

This opens:
- Database logs in one window
- Application logs in another
- Test results in main terminal

### 4. Manual Test Execution

```bash
# Start environment
docker-compose -f docker-compose.test-simple.yml up -d

# Run specific test
docker exec cleansweep-test-runner npm test -- src/__tests__/smoke.test.ts

# View logs
docker logs -f cleansweep-test-runner

# Cleanup
docker-compose -f docker-compose.test-simple.yml down -v
```

## Monitoring & Debugging

### Web-based Log Viewer

When using the full test suite, Dozzle provides a web UI:

```bash
# Start with log viewer
docker-compose -f docker-compose.test-with-logs.yml up -d

# Access at
http://localhost:8080
```

### Container Health Checks

```bash
# Check container status
docker ps | grep cleansweep

# View resource usage
docker stats cleansweep-test-runner cleansweep-test-db

# Inspect container
docker inspect cleansweep-test-runner
```

### Database Debugging

```bash
# Connect to test database
docker exec -it cleansweep-test-db psql -U postgres -d cleansweep_test

# View tables
\dt

# Check migrations
SELECT * FROM schema_migrations;

# Exit
\q
```

## Common Issues & Solutions

### 1. Package Lock Out of Sync

**Error:** `npm ci can only install packages when package.json and package-lock.json are in sync`

**Solution:**
```bash
npm install
docker-compose -f docker-compose.test-simple.yml build --no-cache
```

### 2. Database Connection Failed

**Error:** `could not connect to server: Connection refused`

**Solution:**
```bash
# Ensure database is running
docker ps | grep test-db

# Check logs
docker logs cleansweep-test-db

# Restart if needed
docker restart cleansweep-test-db
```

### 3. Port Already in Use

**Error:** `bind: address already in use`

**Solution:**
```bash
# Find process using port
lsof -i :5434

# Kill process or use different port
docker-compose -f docker-compose.test-simple.yml down
```

### 4. Tests Hanging

**Solution:**
```bash
# Stop all test containers
docker stop cleansweep-test-runner cleansweep-test-db

# Clean up
docker-compose -f docker-compose.test-simple.yml down -v
```

## Best Practices

1. **Always clean up** after tests:
   ```bash
   ./scripts/docker-test-monitor.sh --simple --clean
   ```

2. **Use watch mode** for development:
   ```bash
   ./scripts/docker-test-monitor.sh --simple --watch
   ```

3. **Check logs** on failure:
   ```bash
   ./scripts/monitor-logs.sh app
   ```

4. **Run smoke tests first** before full suite

5. **Keep containers small** - use Alpine images

## CI/CD Integration

For GitHub Actions or other CI systems:

```yaml
- name: Run Docker Tests
  run: |
    docker-compose -f docker-compose.test-simple.yml build
    docker-compose -f docker-compose.test-simple.yml up --abort-on-container-exit
    
- name: Cleanup
  if: always()
  run: docker-compose -f docker-compose.test-simple.yml down -v
```

## Performance Tips

1. **Use Docker BuildKit**:
   ```bash
   export DOCKER_BUILDKIT=1
   ```

2. **Cache dependencies**:
   - Volume mount for node_modules
   - Layer caching in Dockerfile

3. **Parallel execution**:
   - Run test suites concurrently
   - Use Jest's `--maxWorkers` flag

4. **Resource limits**:
   ```yaml
   services:
     test-runner:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
   ```

## Summary

The Docker testing setup provides:
- ✅ Isolated test environment
- ✅ Consistent database state
- ✅ Real-time monitoring
- ✅ Easy debugging
- ✅ CI/CD ready
- ✅ Performance metrics

Use the provided scripts for the best testing experience!