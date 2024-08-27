# Stage 1: Build the application
FROM node:22-alpine as builder

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Build the project
RUN npm run build

# Stage 2: Setup the production environment
FROM node:22-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json for production dependencies
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy the built code from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/server.js"]



# docker build -t rox-api-approval .
# docker run -d -p 3000:3000 rox-api-approval
