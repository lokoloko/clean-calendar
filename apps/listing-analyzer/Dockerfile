# Development stage
FROM node:20-alpine AS dev

WORKDIR /app

# Update npm to support workspaces
RUN npm install -g npm@latest

# Copy package files for the entire monorepo
COPY package*.json ./
COPY turbo.json ./
COPY apps/listing-analyzer/package*.json ./apps/listing-analyzer/

# Create empty packages for workspace reference
RUN mkdir -p packages/ui && echo '{"name":"@gostudiom/ui","version":"1.0.0"}' > packages/ui/package.json

# Install dependencies (npm will handle workspaces)
RUN npm install --legacy-peer-deps

# Copy application code
COPY . .

# Expose port
EXPOSE 9004

# Navigate to the app directory and start
WORKDIR /app/apps/listing-analyzer
CMD ["npm", "run", "dev"]

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Update npm to support workspaces
RUN npm install -g npm@latest

# Copy package files for the entire monorepo
COPY package*.json ./
COPY turbo.json ./
COPY apps/listing-analyzer/package*.json ./apps/listing-analyzer/

# Create empty packages for workspace reference
RUN mkdir -p packages/ui && echo '{"name":"@gostudiom/ui","version":"1.0.0"}' > packages/ui/package.json

# Install production dependencies
RUN npm ci --omit=dev --legacy-peer-deps

# Copy application code
COPY . .

# Build the application
WORKDIR /app/apps/listing-analyzer
RUN npm run build

# Expose port
EXPOSE 9004

# Start production server
CMD ["npm", "start"]