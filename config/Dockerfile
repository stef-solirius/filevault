# Use Node.js LTS version as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY src/azure-sa/package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY src/azure-sa/ ./

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3000

# Set environment variable defaults
ENV PORT=3000

# Start the application
CMD ["node", "index.js"]
