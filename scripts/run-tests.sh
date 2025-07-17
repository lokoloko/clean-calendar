#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 CleanSweep Scheduler Test Suite${NC}"
echo "=================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Function to run tests
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "\n${YELLOW}Running $test_name...${NC}"
    
    if eval $test_command; then
        echo -e "${GREEN}✅ $test_name passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        return 1
    fi
}

# Track failures
failed_tests=0

# 1. Unit Tests
if ! run_test "Unit Tests" "npm run test"; then
    ((failed_tests++))
fi

# 2. Integration Tests (requires database)
echo -e "\n${YELLOW}Setting up test database...${NC}"
docker-compose -f docker-compose.test.yml up -d test-db
sleep 5 # Wait for database to be ready

if ! run_test "Integration Tests" "npm run test:integration"; then
    ((failed_tests++))
fi

# 3. E2E Tests (requires full app)
echo -e "\n${YELLOW}Starting application for E2E tests...${NC}"
npm run dev &
APP_PID=$!
sleep 10 # Wait for app to start

if ! run_test "E2E Tests" "npm run test:e2e"; then
    ((failed_tests++))
fi

# Kill the app
kill $APP_PID 2>/dev/null

# 4. Docker Tests
if ! run_test "Docker Tests" "docker-compose -f docker-compose.test.yml up --abort-on-container-exit test-app"; then
    ((failed_tests++))
fi

# Cleanup
echo -e "\n${YELLOW}Cleaning up...${NC}"
docker-compose -f docker-compose.test.yml down -v

# Summary
echo -e "\n=================================="
if [ $failed_tests -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ $failed_tests test suite(s) failed${NC}"
    exit 1
fi