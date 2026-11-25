# Deploy on Ubuntu with Docker Compose

Use an Ubuntu 24.04 LTS server with at least 2 vCPUs, 4 GB of RAM and enough disk for photographs, PDFs and two weeks of backups. Use a public domain such as `warehouse.example.com`. Point its DNS A record at the server and add an AAAA record only if IPv6 reaches the server. Open TCP 80 and 443 in the provider firewall and keep SSH accessible. Caddy obtains and renews the TLS certificate. [Caddy HTTPS quick start](https://caddyserver.com/docs/quick-starts/https)

## Install Docker

Connect over SSH and run the following. Docker Compose is installed alongside Docker Engine. [Docker’s Ubuntu installation documentation](https://docs.docker.com/engine/install/ubuntu/)

```bash
sudo apt update
sudo apt install -y ca-certificates curl git openssl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker compose version
```

## Configure and start

Clone the repository using its Git URL. All remaining commands run from the repository root. Define the helper again after opening a new shell.

```bash
read -rp 'Repository Git URL: ' repo_url
git clone "$repo_url" issue-note-creator
cd issue-note-creator
dc() { sudo docker compose --env-file .env.prod -f docker-compose.prod.yml "$@"; }

umask 077
read -rp 'Public domain, without https://: ' app_domain
test ! -e .env.prod && {
  printf 'APP_DOMAIN=%s\n' "$app_domain"
  for key in POSTGRES_PASSWORD SESSION_SECRET HEALTH_SECRET CRON_SECRET; do
    printf '%s=%s\n' "$key" "$(openssl rand -hex 32)"
  done
  printf 'AI_PROVIDER=groq\n'
} > .env.prod
nano .env.prod
```

| Variable                                           | Value                                                                                                                         |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `APP_DOMAIN`                                       | Public DNS name. Compose sets `APP_BASE_URL` to `https://APP_DOMAIN`.                                                         |
| `POSTGRES_PASSWORD`                                | Generated hex password. The app and database use the same value. Keep this password when restarting an existing database.     |
| `SESSION_SECRET`, `HEALTH_SECRET`, `CRON_SECRET`   | Independent generated values for signed PDFs, readiness checks and the internal report scheduler.                             |
| `GROQ_API_KEY`                                     | Required for voice and typed-text analysis. `TRANSCRIBE_MODEL` and `PARSE_MODEL` can override the defaults in `.env.example`. |
| `MAIL_FROM`                                        | Verified sender address for reports and confirmation emails.                                                                  |
| `RESEND_API_KEY`                                   | Set to enable Resend.                                                                                                         |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | If using SMTP, set the provider details and leave `RESEND_API_KEY` empty. Use port 465 for implicit TLS or 587 for STARTTLS.  |
| `LOG_LEVEL`                                        | Optional Pino level. Defaults to `info`.                                                                                      |

Compose configures the internal PostgreSQL URL, local Chromium, Cairo timezone and PDF volume. PostgreSQL and Next.js stay on the internal network. The migration service applies the schema before the app starts.

```bash
dc config --quiet
dc up -d --build --wait
dc ps
```

Create the first owner once. Enter a private six-digit PIN. The bootstrap command refuses to replace an existing owner.

```bash
read -rp 'Owner username: ' owner_username
read -rp 'Owner name: ' owner_name
read -rsp 'Owner six-digit PIN: ' owner_pin
printf '\n'
printf '%s\n' "$owner_pin" | dc run --rm -T \
  -e "OWNER_USERNAME=$owner_username" -e "OWNER_NAME=$owner_name" \
  migrate pnpm exec tsx deploy/bootstrap-owner.ts
unset owner_pin
```

Open `https://YOUR_DOMAIN/login`. Sign in as owner, add customers and products, then create the keeper and admin accounts with their own PINs. Enable any reports and the optional confirmation email under **إعدادات النظام**. The report container checks schedules hourly.

To check application readiness without copying the monitor secret to the terminal, run the same probe as Compose.

```bash
dc exec -T app node -e 'fetch("http://127.0.0.1:3000/api/health",{headers:{authorization:"Bearer "+process.env.HEALTH_SECRET}}).then(async r=>{console.log(await r.text());process.exit(r.ok?0:1)})'
dc logs --tail=50 app caddy backup reports
```

## Back up and restore

The backup container writes a PostgreSQL custom-format dump and a PDF archive on startup and every 24 hours, with 14 days of retention. The backup volume is on the same server. Copy completed backup directories off-server. Keep an encrypted copy of `.env.prod` separately.

```bash
dc exec -T backup ls -1 /backups
read -rp 'Backup directory name: ' backup_name
mkdir -m 700 "$backup_name"
dc cp "backup:/backups/$backup_name/." "./$backup_name/"
```

Restore a matching database dump and PDF archive together. The commands below replace the target database and PDF volume contents. Test on a fresh deployment first. On a live server, stop writes and save a separate backup of its current state before restoring.

```bash
test -s "./$backup_name/database.dump" && test -s "./$backup_name/pdfs.tar.gz"
dc stop caddy reports backup app
dc up -d --wait db
dc exec -T db dropdb -U issue_notes --if-exists issue_notes
dc exec -T db createdb -U issue_notes -T template0 issue_notes
dc exec -T db pg_restore -U issue_notes -d issue_notes --exit-on-error --single-transaction \
  < "./$backup_name/database.dump"
dc run --rm -T --no-deps --user root --entrypoint sh app -ec \
  'find /data/pdfs -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +; tar -xzf - -C /data/pdfs; chown -R node:node /data/pdfs' \
  < "./$backup_name/pdfs.tar.gz"
dc run --rm migrate
dc up -d --wait
```

Open an older note and verify that its PDF downloads. Review the app and backup logs.

## Update

Create and export a fresh backup before building a new revision. Schedule a short maintenance window for schema changes.

```bash
dc run --rm backup --once
git pull --ff-only
dc pull db caddy reports backup
dc up -d --build --wait
dc ps
dc logs --tail=50 app migrate
```

If an update fails after applying a schema migration, restore the pre-update backup against the matching previous Git revision. Avoid `docker compose down -v` during ordinary updates because it deletes the persistent volumes.
