#!/usr/bin/env sh
# Backup harian database LK. Pasang di crontab:  15 2 * * * /opt/pembukuan-umkm/deploy/backup.sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p backups
FILE="backups/lk-$(date +%Y%m%d-%H%M).sql.gz"
docker compose exec -T db pg_dump -U lk -d lk | gzip > "$FILE"
# simpan 30 backup terakhir
ls -1t backups/lk-*.sql.gz | tail -n +31 | xargs -r rm --
echo "Backup: $FILE"
