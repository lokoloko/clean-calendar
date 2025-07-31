#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 GoStudioM Test Suite${NC}"
echo "=================================="

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
if ! run_test "Unit Tests" "npm run test -- --passWithNoTests"; then
    ((failed_tests++))
fi

# 2. Type Checking
if ! run_test "TypeScript Type Check" "npm run typecheck"; then
    ((failed_tests++))
fi

# 3. Linting
if ! run_test "ESLint" "npm run lint"; then
    ((failed_tests++))
fi

# Summary
echo -e "\n=================================="
if [ $failed_tests -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ $failed_tests test suite(s) failed${NC}"
    exit 1
fi