#!/bin/bash

echo "🚀 Starting Analytics App with Docker"
echo "====================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo "✅ Docker is running"

# Stop any existing containers
echo "🔄 Stopping any existing containers..."
docker-compose down

# Start the services
echo "🚀 Starting services..."
docker-compose up -d --build

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Run the migration
echo "🔄 Running database migration..."
docker-compose exec -T db psql -U postgres -d cleansweep << 'EOF'
-- Create analytics schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS analytics;

-- Check if tables exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'analytics' 
                   AND table_name = 'properties') THEN
        -- Run the migration
        \i /docker-entrypoint-initdb.d/002_analytics_schema.sql
    ELSE
        RAISE NOTICE 'Analytics schema already exists';
    END IF;
END $$;
EOF

echo ""
echo "✅ Analytics app is running!"
echo ""
echo "📍 Access points:"
echo "   - App: http://localhost:9003"
echo "   - Database: localhost:5433 (postgres/postgres)"
echo ""
echo "📝 Logs:"
echo "   docker-compose logs -f analytics"
echo ""
echo "🛑 To stop:"
echo "   docker-compose down"
echo ""