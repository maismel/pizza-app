# Use lightweight Node.js image
FROM node:20-alpine

# Create working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy remaining code
COPY . .

# Accept argument (microservice name)
ARG APP_NAME
ENV APP_ENV=${APP_NAME}

# Build specific microservice
RUN npm run build ${APP_NAME}

# Command to run compiled microservice
CMD ["sh", "-c", "node dist/apps/${APP_ENV}/main.js"]
