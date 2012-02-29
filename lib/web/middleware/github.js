var urls = require('../urls');

/** Adds github field to devops if github related api is present
 * @param {object} devops devops object
 */
module.exports = function(devops) {
  return function github(req, res, next) {
    devops.github = {"data": {
      "repo": "reach",
      "metrics": [{
          "name": "pull request avg age",
          "unit": "days",
          "aggregate": 1.5,
          "stats": [
            {"diN0bot": 2.0},
            {"sym3tri": 1.0}
          ]
        },
        {
          "name": "number of pull requests",
          "unit": "number",
          "aggregate": 13,
          "stats": [
            {"diN0bot": 10},
            {"sym3tri": 3}
          ]
        },
        {
          "name": "percent of pull requests",
          "unit": "%",
          "aggregate": 100,
          "stats": [
            {"diN0bot": 90},
            {"sym3tri": 10}
          ]
        },
        {
          "name": "percent of pull requests",
          "unit": "%",
          "aggregate": 100,
          "stats": [
            {"diN0bot": 90},
            {"sym3tri": 10}
          ]
        }
      ]}};

    next();
  };
};
