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

# Clear screen
clear

echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}     CleanSweep Scheduler - Real-time Log Monitor       ${NC}"
echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Press Ctrl+C to exit${NC}\n"

# Function to format and colorize logs
format_logs() {
    while IFS= read -r line; do
        # Colorize based on content
        if [[ $line == *"ERROR"* ]] || [[ $line == *"FAIL"* ]]; then
            echo -e "${RED}$line${NC}"
        elif [[ $line == *"WARN"* ]] || [[ $line == *"WARNING"* ]]; then
            echo -e "${YELLOW}$line${NC}"
        elif [[ $line == *"PASS"* ]] || [[ $line == *"SUCCESS"* ]] || [[ $line == *"✓"* ]]; then
            echo -e "${GREEN}$line${NC}"
        elif [[ $line == *"INFO"* ]] || [[ $line == *"LOG"* ]]; then
            echo -e "${BLUE}$line${NC}"
        elif [[ $line == *"TEST"* ]] || [[ $line == *"SUITE"* ]]; then
            echo -e "${PURPLE}$line${NC}"
        else
            echo "$line"
        fi
    done
}

# Check what to monitor
if [ "$1" == "app" ]; then
    echo -e "${CYAN}Monitoring Application Logs...${NC}\n"
    docker logs -f cleansweep-test-runner 2>&1 | format_logs
elif [ "$1" == "db" ]; then
    echo -e "${CYAN}Monitoring Database Logs...${NC}\n"
    docker logs -f cleansweep-test-db 2>&1 | format_logs
elif [ "$1" == "both" ]; then
    echo -e "${CYAN}Monitoring All Logs...${NC}\n"
    
    # Use GNU parallel if available, otherwise use background processes
    if command -v parallel &> /dev/null; then
        parallel --line-buffer ::: \
            "docker logs -f cleansweep-test-runner 2>&1 | sed 's/^/[APP] /' | format_logs" \
            "docker logs -f cleansweep-test-db 2>&1 | sed 's/^/[DB]  /' | format_logs"
    else
        # Database logs in background
        docker logs -f cleansweep-test-db 2>&1 | sed 's/^/[DB]  /' | format_logs &
        DB_PID=$!
        
        # App logs in foreground
        docker logs -f cleansweep-test-runner 2>&1 | sed 's/^/[APP] /' | format_logs
        
        # Clean up on exit
        trap "kill $DB_PID 2>/dev/null" EXIT
    fi
else
    echo -e "${YELLOW}Usage: $0 [app|db|both]${NC}"
    echo -e "  app  - Monitor application logs only"
    echo -e "  db   - Monitor database logs only"
    echo -e "  both - Monitor both application and database logs"
    echo ""
    echo -e "${CYAN}Available containers:${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(cleansweep|clean-calendar)"
fi