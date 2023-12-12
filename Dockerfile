FROM mhart/alpine-node

RUN npm i -g http-server

WORKDIR /site

ADD ./ /site

EXPOSE 8080

CMD ["http-server", "--cors", "-p8080", "/site"]
