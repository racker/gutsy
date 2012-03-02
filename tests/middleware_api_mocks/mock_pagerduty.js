
/** Mocks utils.request_maker with hardcoded data for pagerduty middleware unit tests */
exports.mock_maker = function(xhr_success, data_success) {
  return function(options, on_success, on_err) {
    if (xhr_success) {
      if (data_success) {
        on_success('{"entries": [{"user": {"name": "Zaphod"}, "start": "starttime", "end": "endtime"}]}');
      } else {
        // intentionally provide invalid JSON so that parser will throw an exception
        on_success('{["error": {"message": "API returned error", "code": 22}}');
      }
    } else {
      on_err("mocked XHR on_err called");
    }
  };
};
