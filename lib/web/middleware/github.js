var urls = require('../urls');

/** Adds github field to devops if github related api is present
 * @param {object} devops devops object
 */
module.exports = function(devops) {
  return function github(req, res, next) {
    devops.github = {"data": {
      "avg_age": {
        "diN0bot": 2.4,
        "sym3tri": 8.2,
        "mynnx": 0.3,
        "shawnps": 1.0,
        "TOTAL": null,
        "UNITS": "days"},
      "number_pull_requests": {
        "diN0bot": 2,
        "sym3tri": 73,
        "mynnx": 0,
        "shawnps": 9,
        "TOTAL": 100,
        "UNITS": "%"},
      "percent_pull_requests": {
        "diN0bot": 19,
        "sym3tri": 8,
        "mynnx": 0,
        "shawnps": 1,
        "TOTAL": 13,
        "UNITS": null},
      "staleness_ave_age": {
        "diN0bot": 2.4,
        "sym3tri": 8.2,
        "mynnx": 0.3,
        "shawnps": 1.0,
        "TOTAL": null,
        "UNITS": "days"},
      "number_stale": {
        "diN0bot": 2,
        "sym3tri": 0,
        "mynnx": 0,
        "shawnps": 1,
        "TOTAL": 3,
        "UNITS": null}}};

    next();
  };
};
