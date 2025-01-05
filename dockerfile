# Stage 1: Build stage
FROM node:22-alpine AS builder

# Set the working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Development stage
FROM node:22-alpine AS development

# Set the working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the application code
COPY . .

# Expose the application port
EXPOSE 3000

# Default command for development
CMD ["npm", "run", "start"]

# Stage 3: Production stage (default)
FROM node:22-alpine AS production

# Set the working directory
WORKDIR /usr/src/app

# Install only production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy the build artifacts from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose the application port
EXPOSE 3000

# Default command
CMD ["npm", "run", "start:prod"]