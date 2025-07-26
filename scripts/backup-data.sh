#!/bin/bash

# Backup script for Clean Calendar data
# Run this before adding authentication to preserve all your data

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Clean Calendar Data Backup Script${NC}"
echo "================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set${NC}"
    echo "Please set your database URL first:"
    echo "export DATABASE_URL='your-database-url'"
    exit 1
fi

# Create backup directory
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create multiple backup formats for safety
echo -e "${YELLOW}Creating backups...${NC}"

# 1. SQL dump (human readable)
echo "1. Creating SQL dump..."
pg_dump $DATABASE_URL --no-owner --no-acl > "$BACKUP_DIR/clean_calendar_${TIMESTAMP}.sql"

# 2. Custom format (best for restore)
echo "2. Creating custom format backup..."
pg_dump $DATABASE_URL --format=custom --no-owner --no-acl --file="$BACKUP_DIR/clean_calendar_${TIMESTAMP}.dump"

# 3. Data-only backup (just the data, no schema)
echo "3. Creating data-only backup..."
pg_dump $DATABASE_URL --data-only --no-owner --no-acl > "$BACKUP_DIR/clean_calendar_data_only_${TIMESTAMP}.sql"

# 4. Create a JSON export of critical data
echo "4. Creating JSON export of critical data..."
psql $DATABASE_URL << EOF > "$BACKUP_DIR/clean_calendar_data_${TIMESTAMP}.json"
SELECT json_build_object(
    'backup_date', NOW(),
    'listings', (SELECT json_agg(l.*) FROM public.listings l),
    'cleaners', (SELECT json_agg(c.*) FROM public.cleaners c),
    'schedule_items', (SELECT json_agg(s.*) FROM public.schedule_items s),
    'cleaner_assignments', (SELECT json_agg(ca.*) FROM public.cleaner_assignments ca),
    'manual_schedule_rules', (SELECT json_agg(msr.*) FROM public.manual_schedule_rules msr)
);
EOF

echo -e "${GREEN}Backups created successfully!${NC}"
echo ""
echo "Backup files created:"
echo "- $BACKUP_DIR/clean_calendar_${TIMESTAMP}.sql (Full SQL dump)"
echo "- $BACKUP_DIR/clean_calendar_${TIMESTAMP}.dump (Custom format)"
echo "- $BACKUP_DIR/clean_calendar_data_only_${TIMESTAMP}.sql (Data only)"
echo "- $BACKUP_DIR/clean_calendar_data_${TIMESTAMP}.json (JSON export)"
echo ""
echo -e "${YELLOW}IMPORTANT: Keep these backups safe!${NC}"
echo "You can restore from the custom format backup using:"
echo "pg_restore -d \$DATABASE_URL $BACKUP_DIR/clean_calendar_${TIMESTAMP}.dump"