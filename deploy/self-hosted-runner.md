# Self-hosted runner на ВПС: автодеплой прода после мержа в master

Один и тот же файл лежит в обоих репозиториях (`itk-platform-en/deploy/` и
`inter-ca/deploy/`) — настройка сервера общая, правки держать синхронными.

Инструкция для сервера **212.8.247.141**, где живут оба прод-проекта:
`itk-platform-en` (Docker, `/var/www/itk-portal-prod`) и `inter-ca`
(releases/build, `/var/www/inter-ca`). После настройки мерж PR в `master` любого из
репозиториев сам запускает деплой — SSH-ключи от прода в GitHub не кладутся, всё
выполняется локально на сервере.

Что уже есть в репозиториях (делать не надо, только настроить сервер):

- `itk-platform-en/.github/workflows/deploy-prod.yml` → `deploy.sh`
  (git pull + `docker compose up -d --build` + health-check api/admin/multer +
  автооткат на предыдущий коммит, если стек не отвечает);
- `inter-ca/.github/workflows/deploy-prod.yml` → `deploy/prod-deploy.sh`
  (сборка в `build-new`, атомарная подмена, health-check, автооткат).

Оба workflow'а: `runs-on: [self-hosted, itk-vps]`, `environment: production`,
`workflow_dispatch` для ручного запуска, и `flock /var/lock/itk-deploy.lock`, чтобы
деплои двух репозиториев не пересекались на общем nginx.

## 1. Пользователь для деплоя

Runner не должен работать от root. Заводим отдельного пользователя и даём ему ровно
то, что нужно двум скриптам: docker (для itk-platform-en) и root на один скрипт
inter-ca (он ставит/релоадит nginx).

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy

# inter-ca/deploy/prod-deploy.sh требует root — разрешаем без пароля только его
sudo tee /etc/sudoers.d/deploy-inter-ca >/dev/null <<'SUDO'
deploy ALL=(root) NOPASSWD: /var/www/inter-ca/deploy/prod-deploy.sh
SUDO
sudo chmod 440 /etc/sudoers.d/deploy-inter-ca
sudo visudo -c
```

Рабочие копии должны принадлежать `deploy` — иначе `git pull` / `git reset --hard`
в скриптах упадут по правам:

```bash
sudo chown -R deploy:deploy /var/www/itk-portal-prod
sudo chown -R deploy:deploy /var/www/inter-ca   # сам чекаут; nginx-конфиги остаются root'овыми
sudo install -o deploy -g deploy -m 664 /dev/null /var/lock/itk-deploy.lock
```

Deploy-ключ для git: под `deploy` сгенерировать `ssh-keygen -t ed25519` и добавить
публичный ключ в оба репозитория (Settings → Deploy keys, read-only). Проверить:
`sudo -u deploy ssh -T git@github.com`.

## 2. Установка runner'а (по одному на репозиторий)

GitHub-runner привязывается к репозиторию, поэтому на сервере ставим **два**
экземпляра в разные каталоги, оба с одной меткой `itk-vps`.

Токен регистрации: GitHub → репозиторий → **Settings → Actions → Runners →
New self-hosted runner → Linux x64** (токен живёт ~1 час, для второго репозитория
берётся отдельно).

```bash
sudo -iu deploy
mkdir -p ~/runners/itk-platform-en && cd ~/runners/itk-platform-en
curl -o actions-runner.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.328.0/actions-runner-linux-x64-2.328.0.tar.gz
tar xzf actions-runner.tar.gz

./config.sh --url https://github.com/bit200/itk-platform-en \
            --token <RUNNER_TOKEN> \
            --name itk-platform-en-prod \
            --labels itk-vps \
            --work _work --unattended
exit
```

(версию runner'а брать актуальную с той же страницы New self-hosted runner —
команда там показывается с уже подставленным токеном.)

Ровно то же для inter-ca:

```bash
sudo -iu deploy
mkdir -p ~/runners/inter-ca && cd ~/runners/inter-ca
# распаковать тот же архив
./config.sh --url https://github.com/bit200/inter-ca \
            --token <RUNNER_TOKEN_INTER_CA> \
            --name inter-ca-prod --labels itk-vps --work _work --unattended
exit
```

## 3. Автозапуск (systemd)

Скрипт `svc.sh` из комплекта runner'а сам ставит systemd-юнит:

```bash
cd /home/deploy/runners/itk-platform-en && sudo ./svc.sh install deploy && sudo ./svc.sh start
cd /home/deploy/runners/inter-ca        && sudo ./svc.sh install deploy && sudo ./svc.sh start

sudo ./svc.sh status                    # состояние
systemctl list-units 'actions.runner.*' # оба юнита
```

Юниты ставятся с `enabled`, то есть переживают перезагрузку ВПС. Заодно проверить,
что Docker тоже поднимается после ребута: `systemctl is-enabled docker`.

## 4. Настройки на стороне GitHub (в каждом репозитории)

1. **Settings → Environments → New environment → `production`.** Здесь же при
   желании включить **Required reviewers** — тогда деплой после мержа будет ждать
   ручного подтверждения в интерфейсе GitHub.
2. **Settings → Variables → Actions → New repository variable** (только если путь
   рабочей копии на сервере отличается от дефолта в workflow):
   - `itk-platform-en`: `PROD_APP_DIR` = `/var/www/itk-portal-prod`
   - `inter-ca`: `PROD_APP_DIR` = `/var/www/inter-ca`
3. **Settings → Actions → General → Fork pull request workflows**: убедиться, что
   форки не могут запускать workflow'ы на self-hosted runner'е (значение
   «Require approval for all external contributors»).

Секретов в GitHub не нужно вообще — ни SSH-ключей, ни паролей.

## 5. Проверка

```bash
# ручной прогон без мержа: Actions -> Deploy prod -> Run workflow (ветка master)
```

На сервере:

```bash
sudo -u deploy /var/www/itk-portal-prod/deploy.sh        # тот же путь, что дергает workflow
docker compose -f /var/www/itk-portal-prod/docker-compose.yml ps   # healthy у api/admin/multer
curl -s -o /dev/null -w '%{http_code}\n' https://portal.itk.academy/api/v1/test-ping
```

Логи: вкладка Actions в GitHub (там же виден вывод health-check и откат, если он
случился) и `journalctl -u 'actions.runner.*' -f` на сервере.

## 6. Эксплуатация

- Деплой упал → в Actions видно, на каком health-check'е; стек при этом уже
  автоматически откачен на предыдущий коммит/билд, прод живой.
- Пауза в автодеплое: `sudo ./svc.sh stop` в каталоге нужного runner'а (или
  Settings → Actions → Runners → Disable).
- Обновление runner'а происходит само; после major-обновлений
  `sudo ./svc.sh restart`.
- Staging `itk-platform-en` живёт на другом сервере (80.66.64.58) — если понадобится
  автодеплой и там, ставится третий runner по этой же инструкции с меткой
  `itk-vps-staging`, и заводится workflow с `on: push: branches: [staging]`.
