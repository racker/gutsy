
/** Mocks utils.request_maker with hardcoded data for github middleware unit tests */
exports.mock_maker = function(xhr_success, data_success) {
  return function(options, on_success, on_err) {
    if (xhr_success) {
      if (data_success) {
        on_success(data);
      } else {
        // intentionally provide invalid JSON so that parser will throw an exception
        on_success("{ will [ this ' parse ?");
      }
    } else {
      on_err("mocked XHR on_err called");
    }
  };
};

var data = '{ \
  "pulls": { \
    "issue_updated_at": "2012-02-29T21:45:24Z", \
    "gravatar_id": "2222caaaaaa", \
    "position": 1, \
    "number": 1764, \
    "votes": 0, \
    "issue_user": {}, \
    "comments": 0, \
    "body": "Still need to do validation and notification.", \
    "title": "that_thing", \
    "diff_url": "https://github.com/racker/gutsy/pull/1764.diff", \
    "updated_at": "2012-02-29T21:45:24Z", \
    "user": { \
        "login": "ausername" \
    }, \
    "patch_url": "https: //github.com/racker/gutsy/pull/1764.patch", \
    "base": {}, \
    "mergeable": true, \
    "created_at": "2012-02-29T21: 45: 24Z", \
    "issue_created_at": "2012-02-29T21: 45: 24Z", \
    "labels": [], \
    "head": {}, \
    "html_url": "https: //github.com/racker/gutsy/pull/1764", \
    "state": "open" \
}}';
