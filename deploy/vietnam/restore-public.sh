#!/bin/sh
set -eu
cd /srv/reloo/backups/vietnam
docker exec -i reloo-vn-db-1 pg_restore --list < public-source.dump > public-restore.list
# Keep the initialized public schema; restore its contents transactionally.
sed -i '/^[0-9][0-9]*; .* SCHEMA - public /d' public-restore.list
docker cp public-restore.list reloo-vn-db-1:/tmp/reloo-public-restore.list
docker exec -i reloo-vn-db-1 pg_restore -U postgres -d postgres --no-owner --no-privileges --single-transaction --use-list=/tmp/reloo-public-restore.list < public-source.dump
