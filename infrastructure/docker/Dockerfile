FROM node:22-bookworm-slim
RUN npm install -g pnpm@10.28.2
WORKDIR /workspace
COPY . .
RUN pnpm install --frozen-lockfile
CMD ["pnpm", "dev"]
