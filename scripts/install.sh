#!/bin/sh

ln -s $PWD/initd_gutsy /etc/init.d/gutsy
ln -s $PWD/logrotate_gutsy /etc/logrotate.d/gutsy

mkdir -p /var/log/gutsy

update-rc.d -f gutsy defaults

/etc/init.d/gutsy restart
