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
docker compose up -d --build backend
docker compose exec backend ./node_modules/.bin/prisma db seed
docker compose up -d --build frontend
docker compose ps
curl -I http://127.0.0.1:3000/ru/catalog
curl -I http://127.0.0.1:5000/api
```

При старте backend автоматически применяет только миграции. Seed запускается явно один раз при первичном заполнении чистой базы и переносит из bundled `backend/dev.db` весь исходный контент, включая записи медиа статей. Не добавляй seed в команду запуска и не запускай его при обычном обновлении: он предназначен для восстановления отсутствующих snapshot-записей.

База и рабочие изображения хранятся в отдельных Docker volumes `backend_data` и `backend_images`. Репозиторный каталог `backend/images` используется только при сборке образа и не подключается к работающему контейнеру. В контейнере эти seed-изображения лежат в отдельном bundled-каталоге и при старте копируются в `backend_images`, если соответствующего файла там ещё нет. Поэтому административные загрузки и удаления больше не меняют Git working tree. Не используй `docker compose down -v`: флаг `-v` удаляет оба volume с данными.

Если база была создана старой версией seed и в ней отсутствуют записи `ArticleMedia`, после обновления кода однократно запусти:

```bash
docker compose exec -e SEED_ARTICLE_MEDIA_ONLY=1 backend ./node_modules/.bin/prisma db seed
docker compose exec -u root frontend sh -lc 'rm -rf /app/.next/cache/* && chown -R nextjs:nodejs /app/.next/cache'
docker compose restart frontend
```

Этот режим добавляет только медиа для существующих статей и не восстанавливает удалённые товары, категории, статьи или календари.

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

## 10. Однократный переход со старого каталога изображений

Этот раздел нужен только при первом обновлении сервера с версии, в которой `./backend/images` был подключён напрямую к `/app/images`. Сначала создай и проверь согласованный архив старой базы и изображений, и только потом очищай Git working tree.

До `git pull`, пока на сервере используется старый `docker-compose.yml`:

```bash
cd /opt/foliart
legacy_backup="/tmp/foliart-legacy-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
docker compose stop -t 30 backend
docker compose run --rm --no-deps -T --entrypoint tar backend \
  -czf - -C /app data images >"$legacy_backup"
tar -tzf "$legacy_backup" >/dev/null
docker compose start backend
legacy_name="$(basename "$legacy_backup")"
(cd /tmp && sha256sum "$legacy_name" >"$legacy_name.sha256")
sudo install -d -m 0700 /var/backups/foliart
sudo install -m 0600 "$legacy_backup" /var/backups/foliart/
sudo install -m 0600 "$legacy_backup.sha256" /var/backups/foliart/
printf 'Legacy backup: /var/backups/foliart/%s\n' "$legacy_name"
rm -f "$legacy_backup" "$legacy_backup.sha256"
```

Посмотри, какие runtime-файлы накопились в Git-каталоге. После проверенного архива восстанови каталог до состояния репозитория и удали только неотслеживаемые файлы внутри `backend/images`:

```bash
git status --short backend/images
git clean -nd -- backend/images
git restore --source=HEAD --staged --worktree -- backend/images
git clean -fd -- backend/images
git pull --ff-only
```

Собери новый backend и восстанови только что созданный архив уже в отдельные volumes:

```bash
legacy_backup=/var/backups/foliart/foliart-legacy-YYYYMMDDTHHMMSSZ.tar.gz
docker compose build backend
sudo env SKIP_PRE_RESTORE_BACKUP=1 ./scripts/restore.sh "$legacy_backup"
docker compose up -d --build frontend
docker compose ps
curl -I http://127.0.0.1:5000/api
```

После успешной проверки этот раздел повторять не нужно. Последующие загрузки находятся только в `backend_images` и больше не могут помешать `git pull`.

## 11. Автоматические резервные копии

Скрипт `scripts/backup.sh` на короткое время останавливает backend, поэтому SQLite и каталог изображений попадают в один согласованный снимок. Архив сначала записывается во временный файл, проверяется через `tar`, атомарно переименовывается и получает SHA-256 checksum. По умолчанию копии лежат в `/var/backups/foliart` и хранятся 30 дней.

Установи ежедневный systemd timer:

```bash
cd /opt/foliart
sudo install -m 0644 deploy/systemd/foliart-backup.service /etc/systemd/system/
sudo install -m 0644 deploy/systemd/foliart-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now foliart-backup.timer
sudo systemctl start foliart-backup.service
sudo systemctl status foliart-backup.service --no-pager
sudo systemctl list-timers foliart-backup.timer
sudo ls -lah /var/backups/foliart
```

Периодически копируй архивы и `.sha256` на отдельный сервер или в object storage с шифрованием. Локальная копия защищает от ошибки обновления, но не от потери самого сервера. После изменения пути `/opt/foliart` поправь `WorkingDirectory` и `ExecStart` в unit-файле.

## 12. Обновление сайта

Непосредственно перед каждым обновлением обязательно создай отдельную резервную копию, даже если ночной timer уже работает. При ошибке backup команда завершится ненулевым кодом; в этом случае не продолжай обновление.

```bash
cd /opt/foliart
sudo ./scripts/backup.sh
git pull --ff-only
docker compose up -d --build backend frontend
docker compose exec -u root frontend sh -lc 'rm -rf /app/.next/cache/* && chown -R nextjs:nodejs /app/.next/cache'
docker compose restart frontend
docker compose ps
```

Проверь главную страницу, API и последние логи до удаления старых образов:

```bash
curl -I https://foliart.me
curl -I https://foliart.me/api/
docker compose logs --tail=100 backend frontend
docker image prune -f
```

## 13. Восстановление

`restore.sh` проверяет checksum (если файл `.sha256` лежит рядом), отклоняет неожиданные пути в архиве и перед заменой данных автоматически делает страховочную копию текущего состояния. Затем он восстанавливает оба volume, выставляет права непривилегированного backend-пользователя и запускает backend с миграциями.

```bash
cd /opt/foliart
sudo ./scripts/restore.sh /var/backups/foliart/foliart-YYYYMMDDTHHMMSSZ.tar.gz
docker compose ps
curl -I http://127.0.0.1:5000/api
docker compose logs --tail=100 backend
```

После восстановления проверь несколько товаров, календарей и статей с изображениями. `SKIP_PRE_RESTORE_BACKUP=1` используй только для однократного перехода из раздела 10, где страховочный архив уже создан и проверен.

## Полезные команды

```bash
docker compose logs -f backend
docker compose logs -f frontend
sudo nginx -t
sudo systemctl status nginx
sudo certbot renew --dry-run
```
