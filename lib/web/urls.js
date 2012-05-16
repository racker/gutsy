var root = '/';
var project = null;
exports.META_INDEX = root;
exports.ABOUT = root + 'about';
exports.RUN_CRAWLER = root + 'crawl';

project = root + 'p/:project';
exports.INDEX = project;
exports.DEFECTS = project + '/defects';
exports.DEVHEALTH = project + '/devhealth';
exports.DEPLOYMENT = project + '/deployment';
exports.SERVICE_HEALTH = project + '/service-health';
exports.HIGH_SCORES = project + '/highscores';
exports.HIGH_SCORES_BREAKDOWN = project + '/highscores/:username';
exports.RELEASE_NOTES = project + '/release-notes';
exports.ADD_TITLE = root + 'add-title';

//TODO: this is terrible- change urls to be sane
exports.STATS_API = project +  '/api';

//exports.STATS_API = exports.STATS_API_BASE +'/:project?';
exports.GITHUB_PUSH_API = root + 'api/:api/:project';
