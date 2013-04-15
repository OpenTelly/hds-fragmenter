var path = require('path');
var async = require('async');
var fs = require('fs');
var lfs = require('./file-limited-fs');
var parseF4X = require('./f4x-analyser');
var extractFragments = require('./fragments-extractor.js');

var scanForSegments = function(manifestDirectory, videoName, files) {
	'use strict';
	var i, segments, file, segment;
	segments = [];	
	for (i = 0; i < files.length; i +=1) {
		file = files[i];
		if(path.extname(file) === '.f4x' && file.indexOf(videoName) === 0) {
			segment = {};
			segment.file = path.basename(file, '.f4x');
			segment.directory = manifestDirectory;
			segment.f4f = path.join(segment.directory, segment.file + '.f4f');
			segment.f4x = path.join(segment.directory, file);
			segments.push(segment);
		}
	}
	
	return segments;
};

var findSegments = function(manifest, callback) {
	'use strict';
	lfs.readdir(path.dirname(manifest), function(error, files) {
		if (error) {
			return callback(error);
		}
		
		return callback(null, scanForSegments(path.dirname(manifest), path.basename(manifest, '.f4m'), files));
	});
};

var handleSegments = function(segments, target, callback) {
	'use strict';
	async.each(segments, function(segment, callback) {
		parseF4X(segment.f4x, function(error, f4x) {
			if (error) {
				return callback(error);
			}
			return extractFragments(segment, f4x.fragmentInformation, target, callback);
		});
	}, callback);
};

var f4fExtract = function(manifest, target, callback) {
	'use strict';
	manifest = path.normalize(manifest);
	target = path.normalize(target);

	findSegments(manifest, function(error, segments) {
		if (error) {
			return callback(error);
		}
		
		if (segments.length === 0) {
			return callback(new Error('No segment files found for manifest: ' + manifest));
		}
		
		fs.createReadStream(manifest).pipe(fs.createWriteStream(path.join(target, path.basename(manifest))));
		handleSegments(segments, target, callback);
	});
};

module.exports = f4fExtract;
