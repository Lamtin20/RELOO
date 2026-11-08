#!/usr/bin/env python3
import datetime, pathlib, shutil, sqlite3, subprocess, tempfile, os
os.umask(0o077)
target=pathlib.Path('/srv/reloo/backups/kubernetes');target.mkdir(mode=0o700,parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='reloo-k3s-backup-',dir='/run') as folder:
 root=pathlib.Path(folder)
 source=sqlite3.connect('file:/var/lib/rancher/k3s/server/db/state.db?mode=ro',uri=True)
 with sqlite3.connect(root/'state.db') as out: source.backup(out)
 source.close()
 for file in ['/var/lib/rancher/k3s/server/token','/var/lib/rancher/k3s/server/cred/encryption-config.json','/etc/rancher/k3s/config.yaml']:
  p=pathlib.Path(file)
  if not p.is_file(): raise RuntimeError('CLUSTER_BACKUP_INPUT_MISSING')
  shutil.copyfile(p,root/p.name)
 path=target/('k3s-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'.tar.gz.gpg')
 tar=subprocess.Popen(['tar','-czf','-','-C',str(root),'.'],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
 try:
  subprocess.run(['gpg','--batch','--yes','--pinentry-mode','loopback','--passphrase-file','/srv/reloo/secrets/backup-passphrase','--symmetric','--cipher-algo','AES256','--output',str(path)],stdin=tar.stdout,check=True,stderr=subprocess.DEVNULL)
 finally: tar.stdout.close()
 if tar.wait()!=0: raise RuntimeError('BACKUP_ARCHIVE_FAILED')
 print('ENCRYPTED_K3S_BACKUP_OK')
