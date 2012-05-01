var utils = require('../../utils');

var urls = require('../urls');

/**
 * Fleshes out devops object with defaults for missing optional fields
 *
 * @param devops {Object}
 * @param project {string} name of project; will show up in navbar (currently it is the URL/crawled-file name)
 * @param whereami {string} Optionally the value for the active field used in the navbar; will use project if not provided.
 */
module.exports = function create_navbar(req, res, next) {
	var navbar = {};
	var related_apis;
	var project;
	var devops;

  if (req.devops && req.params && req.params.project) {
		project = req.params.project;
		devops = req.devops;
		related_apis = devops.related_apis;
		navbar[utils.capitalize(project)] = '/p/' + project;

		if (related_apis.version_one) {
			navbar.Defects = urls.DEFECTS.replace(':project', project);
		}

		if (related_apis.github) {
			navbar.DevHealth = urls.DEVHEALTH.replace(':project', project);
		}

		navbar["Service Health"] = urls.SERVICE_HEALTH.replace(':project', project);

		if (related_apis.highscores) {
			navbar["Highscores"] = urls.HIGH_SCORES.replace(':project', project);
		}

		// attach the url so we know where we are in the navbar
		req.devops.url = req.url;

		req.devops.navbar = navbar;
  }
  next();
};

/**
 *@param project {string} Project name (should match devops.json file name)
 *@param devops {Object} devops.json object
 */
exports.create_navbar = function(project, devops) {


  return navbar;
};
