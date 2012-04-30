#!/bin/sh

cp init_d_gutsy /etc/init.d/gutsy

update-rc.d -f gutsy defaults

/etc/init.d/gutsy restart
