var utils = require('../../utils').common;
var http = require('http');
var https = require('https');
var async = require('async');
var _ = require('underscore');

var dreadnot_request_factory = utils.make_class({
    init: function(api_config){
        var self = this;
        self.auth = utils.create_basic_auth(api_config.username, api_config.password);
        self.host = api_config.host;
        if (!api_config.host){
            throw new Error('your dreadnot config needs a host');
        }
    },
    request: function(path){
        var self = this;

        var options = {
            port: 443,
            path: "/api/1.0/stacks" + (path || ''),
            method: 'GET',
            host: self.host,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': self.auth
            }
        };

        return function(cb){
            utils.request_maker(options, cb);
        };
    }
});

var _make_last_merge_task = function(github_config, dread_data){
    var self = this;
    var sha;
    var repo;

    if (!dread_data){
      return;
    }
    try{
      sha = dread_data[0].deploy.to_revision;
      repo = url.parse(dread_data[0].github_href).path.split("/").slice(-1)[0];
    }catch(e){
      log.error(e);
      return;
    }
    self.last_merged_sha = sha;
    self.dreadnot_deploy_href = util.format("https://%s/stacks/%s/regions/%s/deployments/%s",
      self.dreadnot_config.host,
      dread_data[0].deploy.stackName,
      dread_data[0].deploy.region,
      dread_data[0].deploy.name);
    self.dreadnot_deploy_time = new Date(dread_data[0].deploy.time);
    return {
      options: utils.github_options(self.github_config,
        repo,
        util.format('/commits/%s', sha)),
      cb: _.bind(self.github_sha_getter_cb, self)
    };
};
var github_sha_getter_cb = function(err, results){
    var self = this;
    var data;
    var error;

    if (err){
      return self._die(err);
    }
    try{
      data = JSON.parse(results.data);
    }catch(e){
      return self._die(e);
    }
    if (data.message){
      return self._die('Github says: ' + data.message);
    }

    try{
      self.last_pr_commit_to_live_time = new Date(data.commit.committer.date);
      log.log(self.last_pr_commit_to_live_time);
      self.pr_id = data.id;
    }catch(e){
      return self._die(e, 'Github says');
    }
};

module.exports = function dreadnot(payload) {
    var api_config = payload.get_config('dreadnot');
    var requests = [];
    var factory;

    if (api_config.dreadnot === undefined){
        return;
    }

    factory = new dreadnot_request_factory(api_config.dreadnot);

    _.each(api_config.dreadnot.stacks, function(stack){
        _.each(stack, function(regions, stack_name){
            requests.push(factory.request('/' + stack_name));
            _.each(regions, function(region){
                requests.push(factory.request('/' + stack_name + '/regions/' + region + '/deployments'));
            });
        });
    });

    async.parallel(requests, function(err, results){
        var response = [];
        var stack = null;
        var stacks = {};

        if (err) {
            payload.set_data(err);
            return;
        }

        try{
            _.each(results, function(value){
                if (value.res.statusCode !== 200){
                    payload.set_data(value.data);
                    return;
                }
                value = JSON.parse(value.data);
                if (value instanceof Array){
                    stacks[value[0].stackName].deploys = value;
                }else{
                    stacks[value.name] = value;
                }
            });

            _.each(stacks, function(stack, name){
                stack = stacks[name];
                var deployment = {
                    name: stack.name,
                    github_href: stack.github_href,
                    latest_revision: stack.latest_revision,
                    deploy: stack.deploys[0]
                };
                deployment.deploy.from_trunc = deployment.deploy.from_revision.slice(0,6);
                deployment.deploy.to_trunc = deployment.deploy.to_revision.slice(0,6);
                response.push(deployment);
            });
        }catch(e) {
            payload.set_data(e);
            return;
        }
        payload.set_data(null, response);
    });
};

function good_deploy(deploy){
    return (deploy.success && deploy.finished);
}