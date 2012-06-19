

var URLS = require('../urls');

var project_matcher = URLS.INDEX.split(':')[0];

module.exports = function(projects){
  return function(req, res, next){
    var project_name = req.params.project_name;
    var i;
    var project;

    for(i=0; i<projects.length; i++){
      if (projects[i].name === project_name){
        project = projects[i];
        break;
      }
    }
    if (project !== undefined){
      req.project = project;
      return next();
    }

    if (req.url.indexOf(project_matcher) !== 0){
      req.projects = projects;
      return next();
    }

    return res.send("", 404);
  };
};
