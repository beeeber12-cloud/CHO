# Cloud Run 배포용 Dockerfile (Node.js)
FROM node:20-slim

WORKDIR /app

# 의존성 설치 (빌드에 devDependencies 필요 → 전체 설치)
COPY package*.json ./
RUN npm install

# 소스 복사 후 빌드 (vite 프론트 + esbuild 서버 번들)
COPY . .
RUN npm run build

# Cloud Run 은 PORT 환경변수로 트래픽을 보냄 (기본 8080)
ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "start"]
