# Docker Troubleshooting Guide

## Common Docker Issues on macOS

### Issue: Docker daemon not responding

**Symptoms:**
- `Cannot connect to the Docker daemon at unix:///Users/[username]/.docker/run/docker.sock`
- Docker commands hang indefinitely
- I/O errors in Docker logs

**Solutions:**

1. **Force restart Docker Desktop:**
   ```bash
   # Kill all Docker processes
   pkill -9 -f Docker
   
   # Wait a moment
   sleep 5
   
   # Restart Docker Desktop
   open -a "Docker"
   ```

2. **Check Docker logs for errors:**
   ```bash
   tail -50 ~/Library/Containers/com.docker.docker/Data/log/vm/console.log
   ```

3. **If seeing I/O errors, reset Docker to factory defaults:**
   - Open Docker Desktop
   - Go to Settings > Troubleshoot
   - Click "Reset to factory defaults"
   - This will delete all containers and images

4. **Alternative: Restart your Mac**
   - Sometimes a full system restart is needed to clear Docker issues

### Issue: Port conflicts

**Symptoms:**
- Port 5433 already in use
- Cannot start PostgreSQL container

**Solutions:**
```bash
# Check what's using port 5433
lsof -i :5433

# Kill the process if needed
kill -9 <PID>
```

### Development Without Docker

If Docker continues to have issues, you can:

1. **Use cloud database for local development:**
   - Update `.env.local` to point to a cloud PostgreSQL instance
   - This allows testing without Docker

2. **Install PostgreSQL locally:**
   ```bash
   brew install postgresql@15
   brew services start postgresql@15
   createdb cleansweep
   ```

3. **Use the mock auth mode:**
   - Set `NEXT_PUBLIC_USE_AUTH=false` in `.env.local`
   - This bypasses authentication for testing