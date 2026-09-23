# Образ itk-sso: один процесс — провайдер OIDC, экраны входа и админка реестра.
FROM node:20-slim

WORKDIR /app

# Зависимости ставим отдельным слоем, чтобы правка кода не тянула за собой npm ci.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Данные реестра клиентов и журнала токенов (JSON-хранилище) живут в томе, иначе
# пересборка при деплое стирала бы клиентов вместе со слоем контейнера.
ENV SSO_DATA_DIR=/app/data
RUN mkdir -p /app/data /app/keys

CMD ["node", "index.js"]
