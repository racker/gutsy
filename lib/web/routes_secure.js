var urls = require('./urls');
var middleware = require('./middleware');
var settings = require('../settings');
var utils = require('../utils');
var express = require('express');
var async = require('async');
var fs = require('fs');
var _ = require('underscore');

module.exports.install = function(app, status_api, devops){

  app.post(
    urls.API,
    [middleware.basic_auth,
     express.bodyParser()],
    function(req, res) {
      var project = req.params.project;
      var data = req.body;
      var msg;
      //TODO: use swiz for this
      if (!data || _.isEmpty(data)){
        return res.send('You must give me data.  Did you specify the mime type?', 400);
      }
      //TODO: do we need to parse for safety?
      try{
        status_api.handle_push(project, data);
      } catch(e){
        msg = e.message;
        if (settings.debug === true){
          msg += '\n' + e.stack;
        }
        return res.send(msg, 400);
      }
      res.json("OK");
    });
};