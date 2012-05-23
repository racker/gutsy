/**
 * Adds some utility methods to the res.locals for utiltiy in rendering views
 */

var util = require('util');

var _ = require('underscore');
var markdown_js = require('markdown-js');

var db = require('../db');
var settings = require('../../settings');
var utils = require('../../utils');
var urls = require('../urls');

exports.inject = function(polling_data, devops){
  return function(req, res, next){
    var _jade_locals;
    var data;
    // params aren't made yet for some damn reason
    var project = req.url.match('/p/([a-zA-Z_-]+)/*');
    if (project && project.length === 2){
      project = project[1];
      data = polling_data[project];
      // TODO: put this check in a separate middleware
      if (!data) {
        return res.send("", 404);
      }
      res.locals(data);
      req._params = {project: project};
    }
    _jade_locals = new jade_locals(req, res, devops);
    res.locals(_jade_locals);
    next();
  };
};

var jade_locals = utils.make_class({
  init: function(req, res, devops){
    this.req = req;
    this.url = req.url;
    this.devops = devops;
  },
  humane_time: function(time_like){
    var date_object = new Date(time_like);
    return utils.humane_date(date_object);
//      return date_object.toLocaleString();
  },
  format_time: function(date_time){
    if (!util.isDate(date_time)){
      return date_time;
    }
    return util.format('%s-%s-%s %s:%s UTC', date_time.getUTCMonth(),
      date_time.getUTCDate(), date_time.getUTCFullYear(),
      date_time.getUTCHours(), date_time.getUTCMinutes());
  },
  trace: function(error){
    // if in debug mode... and this is a new Error();
    if (settings.debug === true){
      if (_.has(error, 'stack') && error.stack){
        // turn line returns into the HTML equiv
        return JSON.stringify(error.stack.replace(/\n/g, '<br/>'));
      }
      //TODO: extract a callback stack somehow from an error string with magic or emmit a warning
      // this may not be as crazy as it sounds, but many errors here are not exceptions, but are api failures
      // for one reason or another (bad api key, etc)
    }
    if (error.message){
      return JSON.stringify(error.message);
    }
    // fall through
    return JSON.stringify(error);
  },
  title: function(){
    try {
      if (this.req.params.project) {
        return this.req.params.project + ' dash';
      }
    }
    finally {}
    return 'Gutsy';
  },
  navbar: function(){
    var _navbar = {};
    var project, related_apis;
    var req = this.req;
    var devops = this.devops;

    if (devops && req.params && req.params.project) {
      project = req.params.project;
      related_apis = devops[project].related_apis;
      _navbar[utils.capitalize(project)] = '/p/' + project;

      if (related_apis.version_one) {
        _navbar.Defects = urls.DEFECTS.replace(':project', project);
      }

      if (related_apis.github) {
        _navbar['Dev Health'] = urls.DEVHEALTH.replace(':project', project);
        _navbar['Release Notes'] = urls.RELEASE_NOTES.replace(':project', project);
      }

      _navbar["Service Health"] = urls.SERVICE_HEALTH.replace(':project', project);

      if (related_apis.highscores) {
        _navbar["Highscores"] = urls.HIGH_SCORES.replace(':project', project);
      }
    }

    return _navbar;
  },
  is_on_duty: function(member, members_on_duty){
    var i, on_duty;
    for (i=0; i<members_on_duty.length; i++){
      on_duty = members_on_duty[i];
      if (member.name === on_duty.user.name || member.mailto === on_duty.user.email) {
        return true;
      }
    }
    return false;
  },
  markdown: function(text){
    try{
      return markdown_js.makeHtml(text);
    }catch(e){
      return text;
    }
  },
  number_to_place: function(i){
    switch (i+1){
      case 1:
        return '1st';
      case 2:
        return '2nd';
      case 3:
        return '3rd';
      default:
        return i + 1 + 'th';
    }
  },
  utils: utils
});
exports.jade_locals = jade_locals;
