FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN ls -la /app
RUN npm run serve:staging

RUN ls -la /app/dist/MYJOURNEY-FRONTEND

FROM nginx:alpine
COPY --from=build /app/dist/MYJOURNEY-FRONTEND /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
