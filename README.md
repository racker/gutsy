# Gutsy DevOps Dashboard

Gutsy is an app for an out-of-the-box DevOps Dashboard built on top of
[DevOps JSON](/racker/devopsjson) data.

The goal is to reflect not only the most recent raw devops.json data,
but also to realize related APIs such as version control, issue trackers,
build systems and on-call rotations.


## Communication


    irc.freenode.org#gutsy


## Installation

### Node Setup:
Make sure you have node installed. We require at least node 0.8.11.
We recommend ['n'](https://github.com/visionmedia/n/) the node version manager
(similar to ruby's rvm).
Forever helps keep the app running if anything goes boink.

    npm install npm@1.1.12 -g
    npm install n forever -g
    sudo n 0.8.11

### Installing Gutsy

    git clone https://github.com/racker/gutsy.git
    git submodule update --init
    npm install (you will require gcc for the sqlite3 db build)
    cp ./lib/settings.js.example ./lib/settings.js
    cp -r keys_example keys

## Website

Setup your ports:


    iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 8080
    iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 443 -j REDIRECT --to-port 8443


If you want different ports, change them in ```lib/web/app.js```

Run the web app:

    forever start ./bin/gutsy

Add a project using the Add Project button. You're set!

Pages are currently cached for 5 minutes in the local node process to avoid lengthy API calls.
