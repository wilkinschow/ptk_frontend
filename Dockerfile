FROM node:23.11.0-bullseye-slim AS build

WORKDIR /app

COPY package*.json ./

RUN npm install -f

RUN npm i -g @angular/cli

COPY . .

RUN ng build --configuration=production

CMD ["ng", "serve", "--host", "0.0.0.0"]