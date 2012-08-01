# Gutsy DevOps Dashboard

Gutsy is an app for an out-of-the-box DevOps Dashboard built on top of 
[DevOps JSON](/racker/devopsjson) data.

The goal is to reflect not only the most recent raw devops.json data,
but also to realize related APIs such as version control, issue trackers, build systems and on-call rotations.


## Communication

```
irc.freenode.org#gutsy
```

##Installation

###Node Setup:
Make sure you have node installed. We recommend node 0.6.18.
We recommend the 'n' node version manager (similar to ruby's rvm): (https://github.com/visionmedia/n/)

- http://nodejs.org/#download
- npm install -g n
- sudo n 0.6.18

###Installing Gutsy

- git clone https://github.com/racker/gutsy.git
- npm install
- sudo npm start

## Website

Run the web app:

```
sudo npm start
```

Then go to: [http://localhost:3000](http://localhost:3000)
Pages are currently cached for 5 minutes in the local node process to avoid lengthy API calls.
