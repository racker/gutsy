var ViewTester = require('./base').ViewTester;

exports.test_example_minimum = function(test, assert) {
  var viewTester = new ViewTester(test, assert);
  viewTester.test_view('index.jade', 'example-minimum.json', 'pagerduty');
};

exports.test_example_simple = function(test, assert) {
  var viewTester = new ViewTester(test, assert);
  viewTester.test_view('index.jade', 'example-simple.json', 'pagerduty');
};

exports.test_example_full = function(test, assert) {
  var viewTester = new ViewTester(test, assert);
  viewTester.test_view('index.jade', 'example-full.json', 'pagerduty');
};

/** Factory for mocking utils.request_maker */
ViewTester.prototype._mock_maker = function(xhr_success, data_success) {
  return function(options, on_success, on_err) {
    if (xhr_success) {
      if (data_success) {
        on_success("{'entries': [{'user': {'name': 'Zaphod'}, 'start': 'starttime', 'end': 'endtime'}]}");
      } else {
        on_success("{'error': {'message': 'API returned error', 'code': 22}}");
      }
    } else {
      on_err("mocked XHR on_err called");
    }
  };
};
