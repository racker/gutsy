var utils = require('../../utils');
var http = require('http');
var https = require('https');
var async = require('async');
var _ = require('underscore');

var dreadnot_request_maker = utils.make_class({
    init: function(api_config){
        this.options.host = api_config.url;
        this.options.headers.Authorization = utils.create_basic_auth(api_config.username, api_config.password);
    },
    request: function(path){
        if (path){
            this.options.path += path;
        }
        return function(cb){
            utils.request_maker(this.options, cb);
        };
    },
    options: {
        port: 443,
        path: "/api/1.0/stacks",
        method: 'GET',
        host: "",
        headers: {
            'Content-Type': 'application/json',
            'Authorization': ''
        }
    }
});

module.exports = function dreadnot(payload) {
    var api_config = payload.config;
    var requests = [];

    var requester = dreadnot_request_maker(api_config).request;

    _.each(api_config.stacks, function(a_stack){
        _.each(_.keys(a_stack), function(stack_name){
            requests.push(requester('/' + stack_name));
            _.each(a_stack[stack_name], function(region){
                requests.push(requester('/' + stack_name + '/regions/' + region + '/deployments'));
            });
        });
    });

    async.parallel(requests, function(err, results){
        var response = [];
        var stack = null;
        var stacks = {};

        if (err) {
            payload.error = err;
            return;
        }

        try{
            _.each(results, function(value){
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
            payload.error = e;
            return;
        }
        payload.data = response;
    });
};

function good_deploy(deploy){
    return (deploy.success && deploy.finished);
}