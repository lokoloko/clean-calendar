#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🧪 CleanSweep Scheduler - Docker Test Monitor${NC}"
echo "=============================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Function to show usage
show_usage() {
    echo -e "\n${YELLOW}Usage:${NC}"
    echo -e "  $0 [options]"
    echo -e "\n${YELLOW}Options:${NC}"
    echo -e "  -s, --simple     Run simple smoke tests only"
    echo -e "  -f, --full       Run full test suite"
    echo -e "  -w, --watch      Watch logs in real-time"
    echo -e "  -c, --clean      Clean up containers after tests"
    echo -e "  -h, --help       Show this help message"
}

# Parse command line arguments
RUN_MODE="simple"
WATCH_LOGS=false
CLEAN_AFTER=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--simple)
            RUN_MODE="simple"
            shift
            ;;
        -f|--full)
            RUN_MODE="full"
            shift
            ;;
        -w|--watch)
            WATCH_LOGS=true
            shift
            ;;
        -c|--clean)
            CLEAN_AFTER=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_usage
            exit 1
            ;;
    esac
done

# Select the appropriate docker-compose file
if [ "$RUN_MODE" = "simple" ]; then
    COMPOSE_FILE="docker-compose.test-simple.yml"
    echo -e "${BLUE}Running in SIMPLE mode (smoke tests only)${NC}"
else
    COMPOSE_FILE="docker-compose.test-with-logs.yml"
    echo -e "${BLUE}Running in FULL mode (all test suites)${NC}"
fi

# Clean up existing containers
echo -e "\n${YELLOW}🧹 Cleaning up existing containers...${NC}"
docker-compose -f $COMPOSE_FILE down -v 2>/dev/null

# Build the test image
echo -e "\n${YELLOW}🔨 Building test image...${NC}"
docker-compose -f $COMPOSE_FILE build test-runner 2>&1 | grep -E "(Building|Successfully|ERROR|CACHED)"

# Start the database
echo -e "\n${YELLOW}🗄️  Starting test database...${NC}"
docker-compose -f $COMPOSE_FILE up -d test-db

# Wait for database
echo -e "${YELLOW}⏳ Waiting for database...${NC}"
until docker exec cleansweep-test-db pg_isready -U postgres > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e "${GREEN} Ready!${NC}"

# Run migrations
echo -e "\n${YELLOW}📊 Running migrations...${NC}"
for file in supabase/migrations/*.sql; do
    if [ -f "$file" ]; then
        echo -e "  ${BLUE}→ $(basename $file)${NC}"
        docker exec -i cleansweep-test-db psql -U postgres -d cleansweep_test < "$file" 2>&1 | grep -E "(CREATE|ALTER|INSERT|ERROR)" || true
    fi
done

# Start monitoring in background if requested
if [ "$WATCH_LOGS" = true ]; then
    echo -e "\n${PURPLE}📺 Starting log monitor...${NC}"
    
    # Database logs
    docker logs -f cleansweep-test-db 2>&1 | sed 's/^/[DB] /' | grep -v "LOG:  checkpoint" &
    DB_LOG_PID=$!
    
    # Application logs (will start when container runs)
    (sleep 2 && docker logs -f cleansweep-test-runner 2>&1 | sed 's/^/[APP] /') &
    APP_LOG_PID=$!
fi

# Run the tests
echo -e "\n${YELLOW}🧪 Running tests...${NC}"
echo "=================================="

# Start time
START_TIME=$(date +%s)

# Run test container
if [ "$RUN_MODE" = "simple" ]; then
    docker-compose -f $COMPOSE_FILE run --rm test-runner
else
    docker-compose -f $COMPOSE_FILE up --abort-on-container-exit test-app
fi

TEST_EXIT_CODE=$?

# End time
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Kill log monitors if running
if [ "$WATCH_LOGS" = true ]; then
    kill $DB_LOG_PID 2>/dev/null
    kill $APP_LOG_PID 2>/dev/null
fi

# Display results
echo -e "\n=================================="
echo -e "${CYAN}📊 Test Results${NC}"
echo -e "=================================="
echo -e "Duration: ${DURATION}s"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "Status: ${GREEN}✅ PASSED${NC}"
else
    echo -e "Status: ${RED}❌ FAILED${NC}"
    
    # Show last 20 lines of logs on failure
    echo -e "\n${YELLOW}📋 Recent logs:${NC}"
    docker logs cleansweep-test-runner --tail 20 2>&1 | grep -E "(FAIL|Error|ERROR|✕)" || true
fi

# Show container status
echo -e "\n${CYAN}🐳 Container Status:${NC}"
docker-compose -f $COMPOSE_FILE ps

# Cleanup if requested
if [ "$CLEAN_AFTER" = true ]; then
    echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
    docker-compose -f $COMPOSE_FILE down -v
    echo -e "${GREEN}✅ Cleanup complete${NC}"
else
    echo -e "\n${YELLOW}ℹ️  Containers still running for debugging${NC}"
    echo -e "View logs: ${BLUE}docker logs cleansweep-test-runner${NC}"
    echo -e "Clean up: ${BLUE}docker-compose -f $COMPOSE_FILE down -v${NC}"
fi

exit $TEST_EXIT_CODE