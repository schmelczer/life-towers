FROM python:3.8-slim

WORKDIR /home/backend

RUN apt update && apt install libpq-dev gcc libpcre3 libpcre3-dev -y

COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

VOLUME ["/home/backend/sockets"]

ENTRYPOINT ["uwsgi", "--ini", "/home/backend/store.ini"]
