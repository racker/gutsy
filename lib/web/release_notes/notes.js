var utils = require('../../utils/common');
var v1 = require('../../utils/v1');

var V1_SELECTION = ["ChangeDate", "AssetState", "Status.Name", "Name", "Number", "Parent.Name",
  "CreateDate", "Status", "Description"].join(',');

var Note = utils.make_class({
  init: function(pull_request){
    var self = this;
    if (!pull_request){
      pull_request = {base: {}};
    }
    self.title = pull_request.title;
    self.body = pull_request.body;
    self.github_pr_href = pull_request.html_url;
    self.sha = pull_request.base.sha;
    self.id = pull_request.id;
    self.merged_at = new Date(pull_request.merged_at);
    if (isNaN(self.merged_at.valueOf())){
      self.merged_at = undefined;
    }
    self.v1 = {
      body: undefined,
      error: undefined,
      create_date: undefined,
      id: undefined,
      type: undefined,
      change_date: undefined
    };
    self.v1_type = undefined;
  },
  get_id: function () {
    var self = this;
    var id = "";
    id += self.sha + self.id + self.title;
    if (self.v1.id) {
      id += self.v1.id + self.v1.type;
    }
    return id;
  },
  get_changed_date: function () {
    var self = this;
    var date = self.merged_at || self.v1.change_date;
    return date;
  },
  get_body: function () {
    var self = this;
    return (self.body || "" ) + ( self.v1.body || "");
  },
  filter: function(start, end) {
    var self = this;
    return (self.get_changed_date() >= start && self.get_changed_date() <= end);
  },
  set_v1: function(asset){
    var self = this;
    var type;
    var title = '';
    if (!asset){
      return;
    }
    type = v1.match(asset.attributes.Number.text);
    self.v1.type = type.long_name;
    self.v1.body = asset.attributes.Description.text;
    self.v1.create_date = new Date(asset.attributes.CreateDate.text);
    self.v1.id= asset.id.split(':').slice(0, 2).join(':');
    self.v1.change_date = new Date(asset.attributes.ChangeDate.text);

    if (self.title === undefined){
      if (asset.attributes['Parent.Name'].text){
        title += asset.attributes['Parent.Name'].text;
      }
      if (asset.attributes.Name.text){
        title += " : " + asset.attributes.Name.text;
      }
      self.title = title;
    }
  },
  set_error: function(err){
    var self = this;
    self.v1.error = err;
  },
  toJSON: function(v1_config){
    var self = this;
    return {
      title: self.title,
      body: ( self.body || "" ) + ( self.v1.body || ""),
      merged_at: self.merged_at,
      v1_change_date: self.v1.change_date,
      sha: self.sha,
      links: {
        github: self.github_pr_href,
        v1: v1.id_to_url(v1_config, self.v1.id)
      }
    };
  }
});

exports.Note = Note;
exports.SELECTION = V1_SELECTION;
