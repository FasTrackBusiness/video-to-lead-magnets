FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN npm install --legacy-peer-deps || true
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
