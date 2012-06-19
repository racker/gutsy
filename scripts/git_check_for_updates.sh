#/bin/bash

cd /data/gutsy

latestlocal=`git rev-parse HEAD`;
echo $latestlocal
gitrepourl=`git remote -v | grep fetch | awk '{print $2}'`;
echo $gitrepourl;

latestremote=`git ls-remote --heads $gitrepourl master| awk '{print $1}'`;
echo $latestremote;

if [ $latestlocal != $latestremote ]
then
    echo "Changes since last build!";
    git pull && /etc/init.d/gutsy restart
    chown -R gutsy: .
else
    echo "No changes since last build";
fi
