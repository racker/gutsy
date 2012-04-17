# Gutsy DevOps Dashboard

[![Build Status](https://secure.travis-ci.org/diN0bot/gutsy.png?branch\
=closed_pull_requests)](http://travis-ci.org/diN0bot/gutsy)

Gutsy is an app for an out-of-the-box DevOps Dashboard built on top of a
[DevOps JSON URI](/racker/devopsjson).

The goal is to reflect not only the most recent raw devops.json data,
but also to realize related links such as on-call rotations.

[Demo](http://gutsy.nodejitsu.com/)

## Crawl a devops.json endpoint

Save a devops.json endpoint ./fixtures/
OR
Edit lib/settings.js to point to a devops.json:
"Full": "https://raw.github.com/racker/devopsjson/master/examples/example-full.json?login=username&token=********" and run the crawler to download it.

```
git submodule update --init
cp lib/settings.js.example lib/settings.js
mkdir fixtures
./bin/crawl
```

Note: on production deployments, you may need to edit lib/settings.js to an absolute path:

```
exports.saved_crawls_path = "/ABSOLUTE/PATH/fixtures";
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

In order for `--coverage` to work, you'll need to install [node-jscoverage](https://github.com/visionmedia/node-jscoverage)
and [jscoverage](http://siliconforks.com/jscoverage/)

```
$ brew install jscoverage
$ npm install -g jscoverage
```

To run tests without installing jscoverage:

```
./bin/test-nocov
```

## Communication

```
irc.freenode.org#gutsy

