/*
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var http = require('http');
var https = require('https');

var async = require('async');
var _ = require('underscore');

var utils = require('../../utils');
var iface = require('./interface');

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

module.exports = iface.make_poller({
    poll_interval: 60 * 60 * 1000,
    __poll: function(cb){
        var self = this;
        var requests = [];
        var factory = new dreadnot_request_factory(self.api_config);

        _.each(self.api_config.stacks, function(stack){
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
                self.payload.error = err;
                return cb();
            }

            try{
                _.each(results, function(value){
                    if (value.res.statusCode !== 200){
                        self.payload.error = value.data;
                        return cb();
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
                self.payload.error = e;
                return cb();
            }
            self.payload.data = response;
            cb();
        });
    }
});

function good_deploy(deploy){
    return (deploy.success && deploy.finished);
}