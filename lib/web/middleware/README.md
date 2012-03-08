
There are two kinds of middleware in this folder.

Conventional express-connect middleware, eg logger.js.

Devops middleware is specific to the gutsy project. It obeys two properties:

1. Takes devops and request_maker as arguments and returns a conventional express-connect middleware function:

```
/**
 * @param devops {object} devops.json loaded object
 * @param request_maker {function} that implements ./lib/utils.request_maker
 *    This is used by tests to mock API calls
 * @side-effect - May add new top level keys to devops object. Ought not to mutate existing
 *    fields. Note: pagerduty.js currently adds oncall field to contacts :-/
 */
module.exports = function(devops, request_maker) {
  ...
  return function(req, res, next) {
    ...
    next();
  };
});
```

2. Independent of other devops middleware.

For performance reasons, each devops middleware may run asynchronously with other devops middleware
on the same devops.json object.

Each devops middleware may add new keys to devops.json, but ought not mutate existing fields.
