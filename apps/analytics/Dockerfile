FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci 2>/dev/null || npm install

# Development stage
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create directories for uploads and logs
RUN mkdir -p /app/uploads /app/logs

EXPOSE 9003
ENV PORT 9003
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "run", "dev"]