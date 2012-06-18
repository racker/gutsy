

var URLS = require('../urls');

var project_matcher = URLS.INDEX.split(':')[0];

module.exports = function(req, res, next){
  var project_name = req.params.project_name;

  if (project_name && PROJECTS[project_name] !== undefined){
    req.project = PROJECTS[project_name];
    return next();
  }

  if (req.url.indexOf(project_matcher) !== 0){
    req.projects = PROJECTS;
    return next();
  }

  return res.send("", 404);
};
