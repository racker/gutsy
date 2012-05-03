#!/bin/sh

cp scripts/initd_gutsy /etc/init.d/gutsy

update-rc.d -f gutsy defaults

/etc/init.d/gutsy restart
