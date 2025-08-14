#!/bin/bash

# Analytics Database Setup Script

echo "🚀 Analytics Database Setup"
echo "=========================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from apps/analytics directory"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if Docker is running
docker_running() {
    docker info >/dev/null 2>&1
}

# Function to check if Supabase is running
supabase_running() {
    if command_exists supabase; then
        cd ../.. && supabase status >/dev/null 2>&1
        return $?
    fi
    return 1
}

echo ""
echo "📋 Checking prerequisites..."

# Check for Docker
if command_exists docker; then
    echo "✅ Docker installed"
    if docker_running; then
        echo "✅ Docker is running"
    else
        echo "⚠️  Docker is installed but not running"
        echo "   Please start Docker Desktop and try again"
        exit 1
    fi
else
    echo "❌ Docker not installed"
    echo "   Please install Docker Desktop from https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# Check for Supabase CLI
if command_exists supabase; then
    echo "✅ Supabase CLI installed"
else
    echo "⚠️  Supabase CLI not installed"
    echo "   Installing with Homebrew..."
    if command_exists brew; then
        brew install supabase/tap/supabase
    else
        echo "❌ Homebrew not found. Please install manually:"
        echo "   https://supabase.com/docs/guides/cli"
        exit 1
    fi
fi

echo ""
echo "🔍 Checking current setup..."

# Check if Supabase is already running
if supabase_running; then
    echo "✅ Supabase is already running"
    echo ""
    echo "📝 Getting connection details..."
    cd ../..
    supabase status
    
    echo ""
    echo "✅ Database is ready!"
    echo ""
    echo "Next steps:"
    echo "1. Copy the anon key and service_role key from above"
    echo "2. Update apps/analytics/.env.local with these values"
    echo "3. Run: cd apps/analytics && npm run dev"
else
    echo "⚠️  Supabase is not running"
    echo ""
    echo "Starting Supabase..."
    cd ../..
    supabase start
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Supabase started successfully!"
        echo ""
        echo "📝 Connection details:"
        supabase status
        
        echo ""
        echo "🔄 Running analytics schema migration..."
        supabase db push
        
        echo ""
        echo "✅ Database setup complete!"
        echo ""
        echo "Next steps:"
        echo "1. Copy the anon key and service_role key from above"
        echo "2. Update apps/analytics/.env.local with:"
        echo "   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321"
        echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key from above]"
        echo "   SUPABASE_SERVICE_ROLE_KEY=[service_role key from above]"
        echo "3. Run: cd apps/analytics && npm run dev"
    else
        echo "❌ Failed to start Supabase"
        echo "   Please check Docker is running and try again"
        exit 1
    fi
fi

echo ""
echo "📚 Documentation:"
echo "   - Setup guide: apps/analytics/DATABASE_SETUP.md"
echo "   - Migration file: supabase/migrations/002_analytics_schema.sql"
echo ""