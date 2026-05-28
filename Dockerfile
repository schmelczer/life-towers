FROM schmelczera/error-pages as build-error-pages
RUN python build.py 401 403 404 502 50x


FROM node:latest as build-webpage
WORKDIR /home/node

COPY frontend .

RUN npm install
RUN npm run build


FROM nginx:alpine
WORKDIR /var/www
RUN rm -rf *

COPY --from=build-error-pages /home/python/built errors
COPY --from=build-webpage /home/node/dist/frontend .
RUN find . -type f | xargs gzip -k9     &&\
    chmod -R 555 .

VOLUME ["/var/www/sockets"]

COPY ingress/nginx-config /etc/nginx/
