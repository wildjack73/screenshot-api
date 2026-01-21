# Use Playwright's official image which includes browsers
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy source code
COPY src/ ./src/

# Expose port (Railway will set PORT env variable)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
