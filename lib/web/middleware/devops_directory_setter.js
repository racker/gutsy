
/**
 * Defines and sets req.devops_directory to devops_directory
 */
module.exports = function(devops_directory) {
  return function load_devops(req, res, next) {
    req.devops_directory = devops_directory;
    next();
  };
};
