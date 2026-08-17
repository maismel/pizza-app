# Используем легковесный образ Node.js
FROM node:20-alpine

# Создаем рабочую директорию
WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./
COPY prisma ./prisma/

# Устанавливаем зависимости
RUN npm install

# Генерируем Prisma Client
RUN npx prisma generate

# Копируем весь оставшийся код
COPY . .

# Принимаем аргумент (название микросервиса)
ARG APP_NAME
ENV APP_ENV=${APP_NAME}

# Собираем конкретный микросервис
RUN npm run build ${APP_NAME}

# Команда для запуска скомпилированного микросервиса
CMD ["sh", "-c", "node dist/apps/${APP_ENV}/main.js"]
