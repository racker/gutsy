var root = '/';
var project = null;
exports.META_INDEX = root;
exports.ABOUT = root + 'about';

project = root + 'p/:project';
exports.INDEX = project;
exports.DEFECTS = project + '/defects';
exports.DEVHEALTH = project + '/devhealth';
exports.DEPLOYMENT = project + '/deployment';
exports.SERVICE_HEALTH = project + '/service-health';
exports.HIGH_SCORES = project + '/highscores';
exports.RELEASE_NOTES = project + '/release-notes';
exports.API = project +  '/api';