#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🧪 CleanSweep Scheduler - Docker Test Suite with Monitoring${NC}"
echo "========================================================"

# Function to display logs in separate terminal windows (if available)
open_log_window() {
    local service=$1
    local title=$2
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        osascript -e "
        tell application \"Terminal\"
            do script \"docker logs -f cleansweep-test-$service 2>&1 | sed 's/^/[$title] /'\"
            set current settings of selected tab of front window to settings set \"Basic\"
        end tell"
    elif command -v gnome-terminal &> /dev/null; then
        # Linux with gnome-terminal
        gnome-terminal --title="$title Logs" -- bash -c "docker logs -f cleansweep-test-$service 2>&1 | sed 's/^/[$title] /'; exec bash"
    elif command -v xterm &> /dev/null; then
        # Linux with xterm
        xterm -title "$title Logs" -e "docker logs -f cleansweep-test-$service 2>&1 | sed 's/^/[$title] /'" &
    fi
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Clean up any existing containers
echo -e "${YELLOW}🧹 Cleaning up existing test containers...${NC}"
docker-compose -f docker-compose.test-with-logs.yml down -v 2>/dev/null

# Build the test image
echo -e "${YELLOW}🔨 Building test Docker image...${NC}"
docker-compose -f docker-compose.test-with-logs.yml build test-app

# Start the services
echo -e "${YELLOW}🚀 Starting test environment...${NC}"
docker-compose -f docker-compose.test-with-logs.yml up -d test-db log-monitor

# Wait for database to be ready
echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
until docker exec cleansweep-test-db pg_isready -U postgres > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e "${GREEN}✅ Database is ready${NC}"

# Run migrations
echo -e "${YELLOW}📊 Running database migrations...${NC}"
for file in supabase/migrations/*.sql; do
    echo -e "${BLUE}  Running: $(basename $file)${NC}"
    docker exec -i cleansweep-test-db psql -U postgres -d cleansweep_test < "$file"
done

# Start the app container
echo -e "${YELLOW}🎯 Starting application container...${NC}"
docker-compose -f docker-compose.test-with-logs.yml up -d test-app

# Open log monitoring windows
echo -e "${PURPLE}📺 Opening log monitoring windows...${NC}"
open_log_window "db" "Database"
open_log_window "app" "Application"

# Display log monitoring options
echo -e "\n${CYAN}📊 Log Monitoring Options:${NC}"
echo -e "  1. ${GREEN}Web UI:${NC} http://localhost:8080 (Dozzle log viewer)"
echo -e "  2. ${GREEN}Terminal:${NC} Run these commands in separate terminals:"
echo -e "     ${BLUE}docker logs -f cleansweep-test-app${NC}    # Application logs"
echo -e "     ${BLUE}docker logs -f cleansweep-test-db${NC}     # Database logs"
echo -e "  3. ${GREEN}Combined:${NC} ${BLUE}docker-compose -f docker-compose.test-with-logs.yml logs -f${NC}"

# Monitor test execution
echo -e "\n${YELLOW}🧪 Running tests (this may take a few minutes)...${NC}"
echo -e "${YELLOW}Check the log windows or web UI for detailed output${NC}\n"

# Create a simple progress indicator
show_progress() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Follow the main test execution
docker logs -f cleansweep-test-app 2>&1 | while IFS= read -r line; do
    if [[ $line == *"Running unit tests"* ]]; then
        echo -e "${BLUE}▶ Unit Tests Started${NC}"
    elif [[ $line == *"Running integration tests"* ]]; then
        echo -e "${BLUE}▶ Integration Tests Started${NC}"
    elif [[ $line == *"Running E2E tests"* ]]; then
        echo -e "${BLUE}▶ E2E Tests Started${NC}"
    elif [[ $line == *"PASS"* ]]; then
        echo -e "${GREEN}  ✓ ${line}${NC}"
    elif [[ $line == *"FAIL"* ]]; then
        echo -e "${RED}  ✗ ${line}${NC}"
    elif [[ $line == *"Error"* ]] || [[ $line == *"ERROR"* ]]; then
        echo -e "${RED}  ⚠ ${line}${NC}"
    fi
done &

LOG_PID=$!

# Wait for tests to complete
echo -e "\n${YELLOW}Waiting for tests to complete...${NC}"
docker wait cleansweep-test-app > /dev/null 2>&1
TEST_EXIT_CODE=$?

# Kill the log follower
kill $LOG_PID 2>/dev/null

# Get test results
echo -e "\n${CYAN}📊 Test Results Summary:${NC}"
echo "========================================"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
else
    echo -e "${RED}❌ Tests failed with exit code: $TEST_EXIT_CODE${NC}"
    echo -e "\n${YELLOW}Check the logs for details:${NC}"
    echo -e "  ${BLUE}docker logs cleansweep-test-app --tail 50${NC}"
fi

# Show coverage if available
if docker exec cleansweep-test-app test -f coverage/lcov.info 2>/dev/null; then
    echo -e "\n${CYAN}📈 Coverage Report:${NC}"
    docker exec cleansweep-test-app cat coverage/lcov-report/index.html | grep -A 5 "strong" | head -10
fi

# Cleanup option
echo -e "\n${YELLOW}🧹 Cleanup Options:${NC}"
echo -e "  Keep running for debugging: ${BLUE}docker-compose -f docker-compose.test-with-logs.yml ps${NC}"
echo -e "  View logs: ${BLUE}http://localhost:8080${NC}"
echo -e "  Stop all: ${BLUE}docker-compose -f docker-compose.test-with-logs.yml down -v${NC}"

# Ask if user wants to keep containers running
read -p "$(echo -e ${YELLOW}Keep containers running for debugging? [y/N]: ${NC})" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    docker-compose -f docker-compose.test-with-logs.yml down -v
    echo -e "${GREEN}✅ Cleanup complete${NC}"
else
    echo -e "${GREEN}✅ Containers are still running. Access logs at http://localhost:8080${NC}"
fi

exit $TEST_EXIT_CODE