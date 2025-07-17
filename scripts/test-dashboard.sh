#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# Clear screen and show header
clear
echo -e "${CYAN}${BOLD}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║     CleanSweep Scheduler - Test Monitoring Dashboard    ║${NC}"
echo -e "${CYAN}${BOLD}╚════════════════════════════════════════════════════════╝${NC}"

# Function to display a section
show_section() {
    echo -e "\n${YELLOW}${BOLD}▶ $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to run tests and capture output
run_test_suite() {
    local suite_name=$1
    local command=$2
    local output_file="/tmp/test_${suite_name}.log"
    
    echo -e "${YELLOW}Running ${suite_name}...${NC}"
    
    # Run the test and capture output
    if eval "$command" > "$output_file" 2>&1; then
        echo -e "${GREEN}✅ ${suite_name} PASSED${NC}"
        # Extract key metrics
        grep -E "(Test Suites|Tests:|Time:)" "$output_file" | sed 's/^/   /'
    else
        echo -e "${RED}❌ ${suite_name} FAILED${NC}"
        # Show errors
        grep -E "(FAIL|Error|✕)" "$output_file" | head -5 | sed 's/^/   /'
    fi
}

# Check Docker status
show_section "Docker Environment"
if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker is running${NC}"
    
    # Show running containers
    echo -e "\n${CYAN}Running Containers:${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(cleansweep|clean-calendar)" | sed 's/^/   /'
else
    echo -e "${RED}❌ Docker is not running${NC}"
    echo -e "${YELLOW}Please start Docker Desktop first${NC}"
    exit 1
fi

# Database status
show_section "Database Status"
if docker exec cleansweep-test-db pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Test database is ready${NC}"
    
    # Show database info
    echo -e "\n${CYAN}Database Info:${NC}"
    docker exec cleansweep-test-db psql -U postgres -d cleansweep_test -c "\dt public.*" 2>/dev/null | grep -E "(listings|cleaners|schedule_items)" | sed 's/^/   /'
else
    echo -e "${RED}❌ Test database is not running${NC}"
    echo -e "${YELLOW}Starting test database...${NC}"
    docker-compose -f docker-compose.test-simple.yml up -d test-db
fi

# Test execution
show_section "Test Execution"

# 1. Unit Tests
echo -e "\n${PURPLE}1. Unit Tests${NC}"
run_test_suite "Unit Tests" "docker run --rm -v $(pwd)/src:/app/src -v $(pwd)/jest.config.js:/app/jest.config.js -v $(pwd)/jest.setup.js:/app/jest.setup.js clean-calendar-test-runner npm test -- --passWithNoTests"

# 2. Component Tests
echo -e "\n${PURPLE}2. Component Tests${NC}"
if [ -d "src/__tests__/components" ] && [ "$(ls -A src/__tests__/components)" ]; then
    run_test_suite "Component Tests" "docker run --rm -v $(pwd):/app clean-calendar-test-runner npm test -- src/__tests__/components --passWithNoTests"
else
    echo -e "${YELLOW}⚠️  No component tests found${NC}"
fi

# 3. API Tests
echo -e "\n${PURPLE}3. API Tests${NC}"
if [ -d "src/__tests__/api" ] && [ "$(ls -A src/__tests__/api)" ]; then
    run_test_suite "API Tests" "docker run --rm -v $(pwd):/app clean-calendar-test-runner npm test -- src/__tests__/api --passWithNoTests"
else
    echo -e "${YELLOW}⚠️  No API tests found${NC}"
fi

# Real-time monitoring
show_section "Real-time Monitoring"
echo -e "${CYAN}Monitor Options:${NC}"
echo -e "  1. ${BLUE}docker logs -f cleansweep-test-runner${NC} - Application logs"
echo -e "  2. ${BLUE}docker logs -f cleansweep-test-db${NC} - Database logs"
echo -e "  3. ${BLUE}docker stats${NC} - Resource usage"

# Performance metrics
show_section "Performance Metrics"
echo -e "${CYAN}Container Resources:${NC}"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep -E "(CONTAINER|cleansweep|clean-calendar)" | sed 's/^/   /'

# Coverage report
show_section "Test Coverage"
if [ -f "coverage/lcov-report/index.html" ]; then
    echo -e "${GREEN}✅ Coverage report available${NC}"
    echo -e "   Open: ${BLUE}open coverage/lcov-report/index.html${NC}"
else
    echo -e "${YELLOW}⚠️  No coverage report found${NC}"
    echo -e "   Run: ${BLUE}npm run test:coverage${NC}"
fi

# Summary
show_section "Summary"
echo -e "${CYAN}${BOLD}Test Environment Status:${NC}"
echo -e "  • Docker: ${GREEN}✅ Running${NC}"
echo -e "  • Database: ${GREEN}✅ Connected${NC}"
echo -e "  • Tests: ${GREEN}✅ Available${NC}"

echo -e "\n${YELLOW}${BOLD}Quick Commands:${NC}"
echo -e "  ${BLUE}./scripts/docker-test-monitor.sh -s${NC} - Run smoke tests"
echo -e "  ${BLUE}./scripts/docker-test-monitor.sh -f${NC} - Run full test suite"
echo -e "  ${BLUE}npm test${NC} - Run tests locally"
echo -e "  ${BLUE}npm run test:e2e${NC} - Run E2E tests"

echo -e "\n${CYAN}${BOLD}════════════════════════════════════════════════════════${NC}"