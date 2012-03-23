/**
 * Adds some utility methods to the res.locals for utiltiy in rendering views
 */
module.exports = function() {
	return function injector(req, res, next) {
		res.locals(_locals);
	next();
	};
};

var _locals = {
	format_time: function(time_like){
		var date_object = new Date(time_like);
		return date_object.toDateString() + date_object.toTimeString();
	}
};