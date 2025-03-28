FROM node:18.19.0 as build

WORKDIR /app

COPY package*.json ./

RUN npm install -f

RUN npm i -g @angular/cli

COPY . .

RUN ng build --configuration=production

CMD ["ng", "serve", "--host", "0.0.0.0"]