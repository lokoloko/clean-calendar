#!/bin/bash

# Quick migration helper
echo "Clean Calendar - Migration Helper"
echo "================================="
echo ""
echo "This script will help you migrate your data to Supabase."
echo ""
echo "First, we need your LOCAL database URL (where your current data is)."
echo "This is typically one of:"
echo "  - postgresql://localhost:5432/clean_calendar"
echo "  - postgresql://username:password@localhost:5432/clean_calendar"
echo "  - postgresql://postgres@localhost:5432/clean_calendar"
echo ""
read -p "Enter your LOCAL database URL: " LOCAL_DB_URL

# Export for use in other scripts
export DATABASE_URL="$LOCAL_DB_URL"
export SUPABASE_DB_URL="postgresql://postgres:dK9yP1OuTjSrRz9h@db.puvlcvcbxmobxpnbjrwp.supabase.co:5432/postgres"

echo ""
echo "Testing local database connection..."
if psql "$LOCAL_DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✓ Local database connection successful"
else
    echo "✗ Failed to connect to local database"
    echo "Please check your local database URL and try again"
    exit 1
fi

echo ""
echo "Testing Supabase connection..."
if psql "$SUPABASE_DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✓ Supabase connection successful"
else
    echo "✗ Failed to connect to Supabase"
    echo "Please check your Supabase credentials"
    exit 1
fi

echo ""
echo "Ready to migrate!"
echo "This will:"
echo "1. Backup your local data"
echo "2. Copy everything to Supabase"
echo "3. Preserve all your listings, cleaners, and schedules"
echo ""
read -p "Continue with migration? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Starting migration..."
    ./scripts/migrate-to-supabase.sh
else
    echo "Migration cancelled"
fi