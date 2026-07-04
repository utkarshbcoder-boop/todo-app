# Stage 1: Build frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine
WORKDIR /app

# Copy server files
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev
RUN npx prisma generate

# Copy built frontend
COPY --from=frontend /app/dist ./dist

# Copy server source
COPY server/ .

EXPOSE 3001

CMD ["node", "server.js"]
