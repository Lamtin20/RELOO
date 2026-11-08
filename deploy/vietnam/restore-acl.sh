#!/bin/sh
set -eu
cd /srv/reloo/backups/vietnam
docker exec -i reloo-vn-db-1 pg_restore --list < public-with-acl.dump > public-acl.list
sed -i '/^[0-9]/ { / ACL /!d; }' public-acl.list
docker cp public-acl.list reloo-vn-db-1:/tmp/reloo-public-acl.list
docker exec -i reloo-vn-db-1 pg_restore -U postgres -d postgres --no-owner --single-transaction --use-list=/tmp/reloo-public-acl.list < public-with-acl.dump
