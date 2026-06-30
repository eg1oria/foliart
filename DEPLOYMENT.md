# Deployment

Инструкция рассчитана на чистый Ubuntu 22.04/24.04 сервер и домен `foliart.me`.
Если домен другой, замени `foliart.me` и `www.foliart.me` в `.env` и nginx-конфигах.

## 1. DNS

В панели домена направь записи на IP нового сервера:

```text
A     foliart.me      SERVER_IP
A     www.foliart.me  SERVER_IP
```

Перед SSL проверь, что домен уже смотрит на сервер:

```bash
dig +short foliart.me
dig +short www.foliart.me
```

## 2. Базовые пакеты

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl dnsutils gnupg git nginx openssl snapd ufw
sudo systemctl enable --now nginx
```

## 3. Docker Engine и Compose plugin

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker run hello-world
```

Чтобы запускать Docker без `sudo`:

```bash
sudo usermod -aG docker "$USER"
newgrp docker
docker compose version
```

## 4. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

## 5. Certbot

```bash
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/local/bin/certbot
```

## 6. Код проекта

```bash
sudo mkdir -p /opt/foliart
sudo chown "$USER:$USER" /opt/foliart
git clone https://github.com/eg1oria/foliart.git /opt/foliart
cd /opt/foliart
```

Создай production `.env`:

```bash
cp .env.example .env
nano .env
```

Сгенерируй секреты:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Вставь разные значения в `ADMIN_SESSION_SECRET` и `ADMIN_API_SECRET`, поменяй `ADMIN_PASSWORD`.
Для работы формы контакта также заполни `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_FROM_EMAIL` и `CONTACT_TO_EMAIL`.

## 7. Первый запуск Docker

```bash
docker compose up -d --build backend frontend
docker compose ps
curl -I http://127.0.0.1:3000/ru/catalog
curl -I http://127.0.0.1:5000/api
```

## 8. Временный Nginx для выдачи SSL

```bash
sudo mkdir -p /var/www/certbot
sudo tee /etc/nginx/sites-available/foliart >/dev/null <<'NGINX'
server {
    listen 80;
    server_name foliart.me www.foliart.me;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
        default_type text/plain;
        try_files $uri =404;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX
sudo ln -sf /etc/nginx/sites-available/foliart /etc/nginx/sites-enabled/foliart
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Получить сертификат:

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d foliart.me -d www.foliart.me
```

## 9. Полный Nginx

```bash
sudo cp /opt/foliart/nginx.system.conf /etc/nginx/sites-available/foliart
sudo nginx -t
sudo systemctl reload nginx
```

Проверка:

```bash
curl -I https://foliart.me
curl -I https://foliart.me/api/
```

## 10. Обновление сайта

```bash
cd /opt/foliart
git pull
docker compose up -d --build backend frontend
docker compose ps
docker image prune -f
```

## Полезные команды

```bash
docker compose logs -f backend
docker compose logs -f frontend
sudo nginx -t
sudo systemctl status nginx
sudo certbot renew --dry-run
```
