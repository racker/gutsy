# Gutsy DevOps Dashboard

Gutsy is an app for an out-of-the-box DevOps Dashboard built on top of 
[DevOps JSON](/racker/devopsjson) data.

The goal is to reflect not only the most recent raw devops.json data,
but also to realize related APIs such as version control, issue trackers, build systems and on-call rotations.


## Communication

```
irc.freenode.org#gutsy
```


## Crawl a devops.json endpoint

Save a devops.json endpoint ./fixtures/
OR
Edit lib/settings.js to point to a devops.json:
"Full": "https://raw.github.com/racker/devopsjson/master/examples/example-full.json?login=username&token=********" and run the crawler to download it.

```
git submodule update --init
npm install
cp lib/settings.js.example lib/settings.js
cp -r keys_example keys
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
