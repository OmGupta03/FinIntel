FROM node:22-alpine
WORKDIR /app

# 1. Install dependencies
COPY package*.json ./
RUN npm install

# 2. Copy source files
COPY . .

# 3. Build arguments and production build
ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# 4. Expose port and run production server
EXPOSE 3000
CMD ["npm", "start"]
