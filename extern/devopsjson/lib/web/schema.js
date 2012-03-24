// This is the schema definition for devopsjson
exports.schema = {
    'type': 'object',
    'properties': {
        'name': {
            'description': 'Name of your project, format for display',
            'type': 'string',
            'optional': false
        },
        'description': {
            'description': 'Description of your project, format for display',
            'type': 'string',
            'optional': false
        },
        'tags': {
            'description': 'Tags related to your project for searching',
            'type': 'array',
            'optional': true,
            'items': {
                'description': 'Lowercase words',
                'type': 'string',
                'optional': true
            },
            'uniqueItems': true
        },
        'debug': {
            'description': 'enable debug reporting which may be undesired or unsafe in produciton',
            'type': 'boolean',
            'optional': true
        },
        'contacts': {
            'description': 'Contact information for members of various teams',
            'type': 'array',
            'optional': false,
            'minItems': 1,
            'items': {
                'type': 'object',
                'optional': true,
                'properties': {
                    'team_name': {
                        'description': 'The name of the team',
                        'type': 'string',
                        'optional': false
                    },
                    'members': {
                        'type': 'array',
                        'optional': false,
                        'items': {
                            'type': 'object',
                            'optional': false,
                            'properties': {
                                'name': {
                                    'description': 'Full name of team member',
                                    'type': 'string',
                                    'optional': true
                                },
                                'sso': {
                                    'description': 'SSO for team member',
                                    'type': 'string',
                                    'optional': false
                                }
                            },
                            'additionalProperties': {
                                'description': 'Additional identifying information',
                                'type': 'string'
                            }
                        }
                    }
                }
            }
        },
        'links': {
            'description': 'Related useful links (ie source, docs)',
            'type': 'object',
            'optional': true,
            'additionalProperties': {
                'type': 'string'
            }
        },
        'environments': {
            'description': 'List of supported development environments',
            'type': 'array',
            'optional': true,
            'items': {
                'type': 'object',
                'optional': true,
                'properties': {
                    'type': {
                        'description': 'Environment type (ie Staging, Production)',
                        'type': 'string',
                        'optional': false
                    },
                    'platforms': {
                        'description': 'List of platforms (ie Ubuntu 10.4)',
                        'type': 'array',
                        'optional': false,
                        'items': {
                            'type': 'string',
                            'optional': true
                        }
                    },
                    'url': {
                        'description': 'Information on accessing the environment',
                        'type': 'object',
                        'optional': true,
                        'properties': {
                            'url': {
                                'description': 'The url that links to the environment',
                                'type': 'string',
                                'optional': false
                            },
                            'auth': {
                                'description': 'The authentication information for the environment',
                                'type': 'object',
                                'optional': true,
                                'properties': {
                                    'type': {
                                        'description': 'The authentication type (ie basic, oauth2)',
                                        'type': 'string',
                                        'optional': false
                                    },
                                    'username': {
                                        'description': 'The username for authentication',
                                        'type': 'string',
                                        'optional': true
                                    },
                                    'password': {
                                        'description': 'The password for authentication',
                                        'type': 'string',
                                        'optional': true
                                    }
                                }
                            }
                        }
                    },
                    'regions': {
                        'description': 'A list of regions where environment is deployed',
                        'type': 'array',
                        'optional': true,
                        'items': {
                            'type': 'string',
                            'optional': true
                        },
                        'uniqueItems': true
                    }
                }
            }
        },
        'metadata': {
            'description': 'Information about this JSON file',
            'type': 'object',
            'optional': true,
            'properties': {
                'current_version': {
                    'description': 'The most current version number',
                    'type': 'string',
                    'optional': true
                },
                'date_deployed': {
                    'description': 'The date the project was last deployed',
                    'type': 'integer',
                    'optional': true
                }
            }
        },
        'related_apis': {
            'description': 'APIs related to this product',
            'type': 'object',
            'optional': true,
            'pager_duty': {
                'type': 'object',
                'optional': true,
                'additionalProperties': {
                    'subdomain': 'string',
                    'auth': 'string',
                    'schedule_id': 'string',
                    'port': 'integer'
                }
            },
            'version_one': {
                'type': 'object',
                'optional': true,
                'additionalProperties': {
                    'host': 'string',
                    'auth': 'string',
                    'name': 'string',
                    'project': 'integer',
                    'port': 'integer'
                }
            },
            'telligent': {
                'type': 'object',
                'optional': true,
                'additionalProperties': {
                    'url': 'string',
                    'auth': 'string'
                }
            },
            'new_relic': {
                'type': 'object',
                'optional': true,
                'additionalProperties': {
                    'accountId': 'string',
                    'appid': 'string',
                    'apikey': 'string'
                }
            },
            'github': {
                'type': 'object',
                'optional': true,
                'additionalProperties': {
                    'url': 'string',
                    'org': 'string',
                    'repo': 'string',
                    'username': 'string',
                    'apikey': 'string'
                }
            }
        },
        'dependent_services': {
            'description': 'Links to JSON files this product depends upon (ie more devops.json files)',
            'type': 'array',
            'optional': true,
            'items': {
                'type': 'string',
                'optional': true
            }
        },
        'events': {
            'description': 'List of events, such as milestone launches and conferences',
            'type': 'array',
            'optional': true,
            'items': {
                'type': 'object',
                'optional': true,
                'properties': {
                    'name': {'type': 'string'},
                    'description': {'type': 'string'},
                    'timestamp': {'type': 'integer'},
                    'related_links': {
                        'type': 'array',
                        'optional': true,
                        'items': {'type': 'string', 'optional':true}}
                }
            }
        },
        'kpi_spec': {
            'description': 'KPI JSON Spec',
            'type': 'string',
            'optional': true
        }
    }
};
