'use strict';
var fs = require("fs");

var MAX_IOS = 500;
var MAX_RETRIES = 100;

var numberOfConcurrentIOActions = 0;

var limit = function(method) {
	var callback, params, numberOfCallAttempts, call, i;
	
	params = Array.prototype.slice.call(arguments, 1); // arguments is not really an array so it has no slice method of it's own;
	callback = false;
	if (params.length > 0) {
		for (i = params.length-1; i >= 0; i -= 1) {
			if (params[i]) {
				callback = !!(params[i].constructor && params[i].call && params[i].apply) && params[i];
				break;
			}
		}
	}
	numberOfCallAttempts = 0;

	if (callback) {
		call = function() {
			if (numberOfConcurrentIOActions < MAX_IOS) {
				numberOfCallAttempts += 1;
				numberOfConcurrentIOActions += 1;
				return method.apply(fs, params);
			}
			
			return setImmediate(function() {
				numberOfCallAttempts += 1;
				numberOfConcurrentIOActions += 1;
				method.apply(fs, params);
			});
		};
	
		params[params.length-1] = function(error) {
			numberOfConcurrentIOActions -= 1;
			if (numberOfCallAttempts < MAX_RETRIES && error && (error.toString().indexOf('Too many open files') !== -1 || error.toString().indexOf('OK, open') !== -1)) {
				return setImmediate(call);
			}			
			callback.apply(null, Array.prototype.slice.call(arguments));
		};
		
		return call();
	}
	
	return method.apply(fs, params);
};

var exists = function(path, callback) {
	return limit(fs.exists, path, callback);
};

var stat = function(path, callback) {
	return limit(fs.stat, path, callback);
};

var open = function(path, flags, mode, callback) {
	return limit(fs.open, path, flags, mode, callback);
};

var read = function(fd, buffer, offset, length, position, callback) {
	return limit(fs.read, fd, buffer, offset, length, position, callback);
};

var writeFile = function(filename, data, options, callback) {
	return limit(fs.writeFile, filename, data, options, callback);
};

var readdir = function(path, callback) {
	return limit(fs.readdir, path, callback);
};

var readFile = function(filename, options, callback) {
	return limit(fs.readFile, filename, options, callback);
};

var lfs = {
	exists : exists,
	stat : stat,
	open : open,
	read : read,
	writeFile : writeFile,
	readdir : readdir,
	readFile : readFile
};

module.exports = lfs;