var utils = require('../../utils');

/**
 * Fleshes out devops object with defaults for missing optional fields
 *
 * @param devops {Object}
 * @param project {string} name of project; will show up in navbar (currently it is the URL/crawled-file name)
 * @param whereami {string} Optionally the value for the active field used in the navbar; will use project if not provided.
 */
module.exports = function create_navbar(req, res, next) {
  if (req.devops && req.params && req.params.project) {
    // create project specific navbar
    req.devops.navbar = utils.create_navbar(req.params.project, req.devops);

    // attach the url so we know where we are in the navbar
    req.devops.url = req.url;
  }
  next();
};
