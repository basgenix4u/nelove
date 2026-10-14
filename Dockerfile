FROM node:22-slim
WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# Build the SPA and syntax-check the server.
COPY . .
RUN npm run build

# PORT is injected by the host (Render); the app reads process.env.PORT.
ENV NODE_ENV=production
EXPOSE 8787
CMD ["npm", "start"]
