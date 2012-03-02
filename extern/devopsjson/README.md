# DevOps JSON

DevOps JSON defines a [well-known URI](http://tools.ietf.org/html/rfc5785) for DevOps information.

## Schema

[schema](https://github.com/racker/devopsjson/blob/master/lib/web/schema.js) and [outline.md](https://github.com/racker/devopsjson/blob/master/outline.md) contain the specification itself.

## Validator

Public instance: [http://devopsjson.com](http://devopsjson.com)

Or run this app:

```
git@github.com:racker/devopsjson.git
cd devopsjson
./bin/devopsjson
```

Then visit: [http://localhost:3000/](http://localhost:3000/ )

## Tests

If the schema or examples change, please ensure that the tests still pass:

```
./bin/tester
```

## Vision

The vision of this project is to:

- Define this spec
- Provide a DevOps JSON validation service at [http://devopsjson.com](http://devopsjson.com).
- Provide a [DevOps JSON registration app](/racker/devops.json-registration) for public devops.json endpoints.
- Provide a [DevOps Dashboard](/racker/gutsy) cloneable app that bootstraps on top of the DevOps JSON spec.
- Encourage developers everywhere to implement this spec and build additional services and apps on top.

## Why you might care

### Access

Access to critical and likely-uptodate service information. 

For example, when an operational problem or security exploit is found, one 
can immediately retrieve a list of operations or security contacts, as well as 
potentially read-only access to related services such as [PagerDuty on-call schedules](http://pagerduty.com/).

### Standard

Standard API for aggregating information across services.

For example, one might build a dashboard that graphs dependencies between services, as well as 
pulls in monitoring information, so that the consequences of operational problems across the network are apparent.

### Bootstrapping and Automation

Having a standard spec encourages apps such as the [gutsy DevOps Dashboard](/racker/gutsy), which bootstraps the 
initial framework and automatically reflects not only the most recent raw devops.json data, but also realizes 
related links such as on-call rotations.
