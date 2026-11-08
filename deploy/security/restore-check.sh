#!/bin/bash
set -euo pipefail
umask 077
root=/srv/reloo/backups/automatic
archive=$(find "$root" -maxdepth 1 -type f -name 'reloo-*.tar.gz.gpg' | sort | tail -n 1)
test -n "$archive"
work=$(mktemp -d /srv/reloo/backups/restore-check.XXXXXXXX)
database="reloo_restore_check_$(date -u +%Y%m%d%H%M%S)_$$"
cleanup(){
 case "$database" in reloo_restore_check_*) docker exec reloo-vn-db-1 dropdb -U postgres --if-exists "$database" >/dev/null 2>&1 || true;; esac
 case "$work" in /srv/reloo/backups/restore-check.*) rm -rf -- "$work";; esac
}
trap cleanup EXIT
gpg --batch --quiet --pinentry-mode loopback --passphrase-file /srv/reloo/secrets/backup-passphrase --decrypt "$archive" | tar -xzf - -C "$work" database.dump
docker exec reloo-vn-db-1 createdb -U postgres -T template0 "$database"
if ! docker exec -i reloo-vn-db-1 pg_restore -U postgres -d "$database" --no-owner --no-privileges --exit-on-error < "$work/database.dump" > "$work/restore.log" 2>&1; then
 cp "$work/restore.log" /srv/reloo/backups/restore-last-error.log
 echo 'RESTORE_CHECK_FAILED; inspect root-only restore-last-error.log';exit 1
fi
counts=$(docker exec reloo-vn-db-1 psql -U postgres -d "$database" -Atc "select json_build_object('profiles',(select count(*) from public.profiles),'assets',(select count(*) from public.assets),'articles',(select count(*) from public.news_articles),'auth_users',(select count(*) from auth.users))")
printf '%s\n%s\n' "RESTORE_CHECK_OK $(date -u +%FT%TZ)" "$counts" > "$root/last-restore-check"
cat "$root/last-restore-check"
