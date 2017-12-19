FROM node:8.2.1

MAINTAINER Patiphan

LABEL "version"="1.0.0"

RUN mkdir -p /var/www/app/myapp

WORKDIR /var/www/app/myapp
ADD package.json ./
RUN npm i --production

RUN npm i -g pm2

ADD . /var/www/app/myapp

EXPOSE 3000

CMD ["pm2", "start", "processes.json", "--no-daemon"]
