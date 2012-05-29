#!/bin/sh

LOGROTATE_FILE="/etc/logrotate.d/gutsy"

ln -s $PWD/initd_gutsy /etc/init.d/gutsy
cp $PWD/logrotate_gutsy $LOGROTATE_FILE
chown root: $LOGROTATE_FILE

mkdir -p /var/log/gutsy

update-rc.d -f gutsy defaults

/etc/init.d/gutsy restart
