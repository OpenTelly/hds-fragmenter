var lfs = require('./file-limited-fs');
var async = require('async');
var path = require('path');


var extractFragment = function(segmentFile, fragmentFile, fragmentStart, fragmentLength, callback) {
	'use strict';
	
	lfs.open(segmentFile, 'r', function(error, segment) {
		if (error) {
			return callback(error);
		}
		
		var buffer = new Buffer(fragmentLength);
		lfs.read(segment, buffer, 0, fragmentLength, fragmentStart, function(error, bytesRead, buffer) {
			if (error) {
				return callback(error);
			}			
			lfs.writeFile(fragmentFile, buffer, function (error) {
				return callback(error);
			});
		});
	});
};

var extractFragments = function(segment, fragmentInformation, target, callback) {
	'use strict';
	var segmentFile = segment.f4f;
	
	lfs.exists(segmentFile, function(segmentExists) {
		if (!segmentExists) {
			return callback(new Error('Segment does not exist. ' + segmentFile));
		}
		lfs.stat(segmentFile, function(error, stats) {
			if (error) {
				return callback(error);
			}
			async.each(fragmentInformation, function(fragment, callback) {
				var end, length, fragmentFile;
				end = fragment.end || stats.size;
				length = end - fragment.start;
				fragmentFile = path.join(target, segment.file + fragment.name);					
				extractFragment(segmentFile, fragmentFile, fragment.start, length, callback);					
			}, function(error) {
				callback(error);
			});
		});
	});
};

module.exports = extractFragments;