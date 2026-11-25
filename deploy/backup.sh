#!/bin/sh
set -eu
umask 077

backup() (
  timestamp=$(date -u +%Y-%m-%dT%H%M%SZ)
  staging=$(mktemp -d /backups/.pending.XXXXXX) || exit 1
  trap 'rm -rf "$staging"' EXIT
  # Take the database snapshot first. Issued PDF files are written before
  # their rows commit, so the later filesystem snapshot includes their bytes.
  pg_dump --format=custom --file="$staging/database.dump" || exit 1
  tar -czf "$staging/pdfs.tar.gz" -C /data/pdfs . || exit 1
  mv -T "$staging" "/backups/$timestamp" || exit 1
  find /backups -mindepth 1 -maxdepth 1 -type d -name '20??-??-??T??????Z' -mtime +13 -exec rm -rf {} +
  printf 'Backup complete %s\n' "$timestamp"
)

if [ "${1:-}" = "--once" ]; then
  backup
  exit
fi

while :; do
  if (backup); then
    sleep 86400
  else
    printf 'Backup failed; retrying in one hour\n' >&2
    sleep 3600
  fi
done
