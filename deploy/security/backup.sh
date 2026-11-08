#!/bin/bash
set -euo pipefail
umask 077
exec 9>/run/reloo-security-backup.lock
flock -n 9 || exit 0
root=/srv/reloo/backups/automatic
key=/srv/reloo/secrets/backup-passphrase
stamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$root" /srv/reloo/secrets
chmod 700 "$root"
if [ ! -s "$key" ]; then openssl rand -hex 32 > "$key"; chmod 600 "$key"; fi
work=$(mktemp -d "$root/work.XXXXXXXX")
trap 'case "$work" in "$root"/work.*) rm -rf -- "$work";; esac' EXIT
docker exec reloo-vn-db-1 pg_dump -U postgres -d postgres -Fc > "$work/database.dump"
test -s "$work/database.dump"
docker exec -i reloo-vn-db-1 pg_restore --list < "$work/database.dump" >/dev/null
files=(data/public-media data/private-evidence apps/web/.env.production apps/web/.env.tunnel apps/vietnam/.env apps/vietnam/compose.yml apps/web/compose.yml)
for file in "${files[@]}"; do test -e "/srv/reloo/$file"; done
for directory in config secrets stacks security; do if [ -d "/srv/reloo/$directory" ]; then files+=("$directory"); fi; done
archive="$root/reloo-$stamp.tar.gz.gpg"
tar -czf - -C "$work" database.dump -C /srv/reloo "${files[@]}" |
 gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-file "$key" --symmetric --cipher-algo AES256 --compress-algo none --output "$archive.partial"
gpg --batch --quiet --pinentry-mode loopback --passphrase-file "$key" --decrypt "$archive.partial" | tar -tzf - >/dev/null
mv "$archive.partial" "$archive"
sha256sum "$archive" > "$archive.sha256"
printf '%s %s\n' "$stamp" "BACKUP_OK" > "$root/last-success"
# Deliberately no automatic deletion until off-machine retention is configured.
logger -t reloo-backup "Encrypted database/media/config backup verified: $stamp"
echo "BACKUP_OK $stamp"
