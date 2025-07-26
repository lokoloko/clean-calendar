#!/bin/bash

# Migration script to move data from local to Supabase
# Preserves all existing data including the dev user associations

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Clean Calendar - Migrate to Supabase${NC}"
echo "===================================="

# Check environment variables
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL (local) not set${NC}"
    exit 1
fi

if [ -z "$SUPABASE_DB_URL" ]; then
    echo -e "${YELLOW}SUPABASE_DB_URL not set${NC}"
    echo "Please set your Supabase database URL:"
    echo "export SUPABASE_DB_URL='postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres'"
    exit 1
fi

# Create backup first
echo -e "${YELLOW}Step 1: Creating local backup...${NC}"
./scripts/backup-data.sh

# Create temp directory for migration files
TEMP_DIR="./temp_migration"
mkdir -p $TEMP_DIR

# Export schema
echo -e "${YELLOW}Step 2: Exporting schema...${NC}"
pg_dump $DATABASE_URL \
    --schema-only \
    --no-owner \
    --no-acl \
    --no-comments \
    --if-exists \
    --clean \
    > "$TEMP_DIR/01_schema.sql"

# Export sequences separately to ensure proper values
echo -e "${YELLOW}Step 3: Exporting sequences...${NC}"
psql $DATABASE_URL -t -A -c "
SELECT 
    'SELECT setval(''' || sequence_schema || '.' || sequence_name || ''', ' || 
    'COALESCE((SELECT MAX(' || column_name || ') FROM ' || table_schema || '.' || table_name || '), 1), true);'
FROM information_schema.sequences
JOIN information_schema.columns ON columns.column_default LIKE 'nextval(''' || sequence_name || '%'
WHERE sequence_schema = 'public';
" > "$TEMP_DIR/02_sequences.sql"

# Export data
echo -e "${YELLOW}Step 4: Exporting data...${NC}"
pg_dump $DATABASE_URL \
    --data-only \
    --no-owner \
    --no-acl \
    --disable-triggers \
    --column-inserts \
    > "$TEMP_DIR/03_data.sql"

# Create RLS policies for dev mode
echo -e "${YELLOW}Step 5: Creating RLS policies...${NC}"
cat > "$TEMP_DIR/04_rls_policies.sql" << 'EOF'
-- Enable RLS on all tables
ALTER TABLE IF EXISTS public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cleaners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cleaner_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.manual_schedule_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cleaner_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cleaner_feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Dev mode - full access to listings" ON public.listings;
DROP POLICY IF EXISTS "Dev mode - full access to cleaners" ON public.cleaners;
DROP POLICY IF EXISTS "Dev mode - full access to schedule_items" ON public.schedule_items;
DROP POLICY IF EXISTS "Dev mode - full access to cleaner_assignments" ON public.cleaner_assignments;
DROP POLICY IF EXISTS "Dev mode - full access to manual_schedule_rules" ON public.manual_schedule_rules;
DROP POLICY IF EXISTS "Dev mode - full access to share_links" ON public.share_links;
DROP POLICY IF EXISTS "Dev mode - full access to cleaner_sessions" ON public.cleaner_sessions;
DROP POLICY IF EXISTS "Dev mode - full access to cleaner_feedback" ON public.cleaner_feedback;

-- Create temporary dev mode policies (will be updated when auth is implemented)
CREATE POLICY "Dev mode - full access to listings" ON public.listings FOR ALL USING (true);
CREATE POLICY "Dev mode - full access to cleaners" ON public.cleaners FOR ALL USING (true);
CREATE POLICY "Dev mode - full access to schedule_items" ON public.schedule_items FOR ALL USING (true);
CREATE POLICY "Dev mode - full access to cleaner_assignments" ON public.cleaner_assignments FOR ALL USING (true);
CREATE POLICY "Dev mode - full access to manual_schedule_rules" ON public.manual_schedule_rules FOR ALL USING (true);
CREATE POLICY "Dev mode - full access to share_links" ON public.share_links FOR ALL USING (true);
CREATE POLICY "Dev mode - full access to cleaner_sessions" ON public.cleaner_sessions FOR ALL USING (true);
CREATE POLICY "Dev mode - full access to cleaner_feedback" ON public.cleaner_feedback FOR ALL USING (true);
EOF

# Apply to Supabase
echo -e "${YELLOW}Step 6: Applying to Supabase...${NC}"
echo "This will:"
echo "1. Create schema"
echo "2. Import all data"
echo "3. Set up sequences"
echo "4. Enable RLS with dev policies"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Migrating to Supabase...${NC}"
    
    # Apply schema
    echo "Applying schema..."
    psql $SUPABASE_DB_URL < "$TEMP_DIR/01_schema.sql"
    
    # Import data
    echo "Importing data..."
    psql $SUPABASE_DB_URL < "$TEMP_DIR/03_data.sql"
    
    # Fix sequences
    echo "Fixing sequences..."
    psql $SUPABASE_DB_URL < "$TEMP_DIR/02_sequences.sql"
    
    # Apply RLS policies
    echo "Applying RLS policies..."
    psql $SUPABASE_DB_URL < "$TEMP_DIR/04_rls_policies.sql"
    
    echo -e "${GREEN}Migration completed!${NC}"
    
    # Verify migration
    echo -e "${YELLOW}Verifying migration...${NC}"
    psql $SUPABASE_DB_URL << EOF
SELECT 
    'Listings' as table_name, 
    COUNT(*) as count 
FROM public.listings
UNION ALL
SELECT 'Schedule Items', COUNT(*) FROM public.schedule_items
UNION ALL
SELECT 'Cleaners', COUNT(*) FROM public.cleaners
UNION ALL
SELECT 'Cleaner Assignments', COUNT(*) FROM public.cleaner_assignments;
EOF
    
else
    echo -e "${RED}Migration cancelled${NC}"
fi

# Cleanup
rm -rf $TEMP_DIR

echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Update your .env.local with:"
echo "   DATABASE_URL=your-supabase-connection-string"
echo "2. Test the application"
echo "3. Once verified, we can proceed with auth implementation"