# Gutsy DevOps Dashboard

[![Build Status](https://secure.travis-ci.org/diN0bot/gutsy.png?branch\
=closed_pull_requests)](http://travis-ci.org/diN0bot/gutsy)

Gutsy is an app for an out-of-the-box DevOps Dashboard built on top of a
[DevOps JSON URI](/racker/devopsjson).

The goal is to reflect not only the most recent raw devops.json data,
but also to realize related links such as on-call rotations.

[Demo](http://gutsy.nodejitsu.com/)

## Crawl a devops.json endpoint

Save a devops.json endpoint to file using the crawler:

```
cp settings.js.example settings.js
mkdir fixtures
./bin/crawl
```

## Website

Run the web app:

```
npm start
```

Then go to: [http://localhost:3000](http://localhost:3000)
Pages are currently cached for 5 minutes in the local node process to avoid lengthy API calls.

## Tests

```
npm test
```

In order for `--coverage` to work, you'll need to install [node-jscoverage](https://github.com/Kami/node-jscoverage ).

To run tests without installing jscoverage:

```
./bin/test-nocov
```

## Communication

```
irc.freenode.org#gutsy
