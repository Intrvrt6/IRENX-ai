FROM oven/bun:1-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY . .

EXPOSE 3000

CMD ["bun", "run", "api/index.ts"]
