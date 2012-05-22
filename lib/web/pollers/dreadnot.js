var utils = require('../../utils');
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

module.exports = function dreadnot(payload) {
    var api_config = payload.get_config();
    var requests = [];
    var factory = new dreadnot_request_factory(api_config);

    _.each(api_config.stacks, function(stack){
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