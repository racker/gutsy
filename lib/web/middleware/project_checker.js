

var URLS = require('../urls');

var project_matcher = URLS.INDEX.split(':')[0];

module.exports = function(devops){
  return function(req, res, next){

    var project = req.params.project;
    if (project && devops[project] !== undefined){
      return next();
    }

    if (req.url.indexOf(project_matcher) !== 0){
      return next();
    }

    return res.send("", 404);
  };
};