var ExtendedBuffer = require('./ExtendedBuffer');
var lfs = require('./file-limited-fs');
var path = require('path');

var AFRA_TYPE_LENGTH = 4;
var AFRA_FLAGS_LENGTH = 3;

var AFRA_MASK_LONG_ID = 128;
var AFRA_MASK_LONG_OFFSET = 64;
var AFRA_MASK_GLOBAL_ENTRIES = 32;


var parseF4XHeaders = function(extendedBuffer) {
	'use strict';
	var headers = {};
	
	headers.size = extendedBuffer.readUnsignedInt();
	headers.type = extendedBuffer.readUTFBytes(AFRA_TYPE_LENGTH);
	headers.version = extendedBuffer.readUnsignedByte();
	headers.flags = extendedBuffer.readUnsignedBytes(AFRA_FLAGS_LENGTH);
	
	headers.sizes = extendedBuffer.readUnsignedByte();
	headers.longIdFields = (headers.sizes & AFRA_MASK_LONG_ID) > 0;
	headers.longOffsetFields = (headers.sizes & AFRA_MASK_LONG_OFFSET) > 0;
	headers.globalEntries = (headers.sizes & AFRA_MASK_GLOBAL_ENTRIES) > 0;

	headers.timescale = extendedBuffer.readUnsignedInt();
	return headers;
};

var parseF4XLocalRandomAccessEntries = function(headers, extendedBuffer) {
	'use strict';
	var numberOfEntries, index, entry, localRandomAccessEntries;

	localRandomAccessEntries = [];
	numberOfEntries = extendedBuffer.readUnsignedInt();
	
	for(index = 0; index < numberOfEntries; index += 1) {
		entry = {};
		entry.time = extendedBuffer.readLongUnsignedInt();
		
		if(headers.longOffsetFields) {
			entry.offset = extendedBuffer.readLongUnsignedInt();
		}
		else {
			entry.offset = extendedBuffer.readUnsignedInt();
		}
		
		localRandomAccessEntries.push(entry);
	}
	
	return localRandomAccessEntries;
};

var parseF4XGlobalRandomAccessEntries = function(headers, extendedBuffer) {
	'use strict';
	var numberOfEntries, index, entry, globalRandomAccessEntries;
	
	globalRandomAccessEntries = [];
	if(headers.globalEntries) {
		numberOfEntries = extendedBuffer.readUnsignedInt();
		
		for(index = 0; index < numberOfEntries; index += 1) {
			entry = {};			
			entry.time = extendedBuffer.readLongUnsignedInt();
			
			if(headers.longIdFields) {
				entry.segment = extendedBuffer.readUnsignedInt();
				entry.fragment = extendedBuffer.readUnsignedInt();
			}
			else {
				entry.segment = extendedBuffer.readUnsignedBytes(2);
				entry.fragment = extendedBuffer.readUnsignedBytes(2);
			}
			
			if (headers.longOffsetFields) {
				entry.afraOffset = extendedBuffer.readLongUnsignedInt();
				entry.offsetFromAfra = extendedBuffer.readLongUnsignedInt();
			}
			else {
				entry.afraOffset = extendedBuffer.readUnsignedInt();
				entry.offsetFromAfra = extendedBuffer.readUnsignedInt();
			}
			
			globalRandomAccessEntries.push(entry);
		}
	}
	
	return globalRandomAccessEntries;
};

var extractF4XFragmentInformation = function(globalRandomAccessEntries, fragmentNumber) {
	'use strict';
	var index, entry, fragmentInformation;
	
	fragmentInformation = [];
	for(index = 0; index < globalRandomAccessEntries.length; index += 1) {
		if (globalRandomAccessEntries[index].segment === fragmentNumber) {
			entry = {};
			
			entry.name = '-Frag'+globalRandomAccessEntries[index].fragment;
			entry.start = globalRandomAccessEntries[index].afraOffset;
			entry.end = globalRandomAccessEntries[index+1] ? globalRandomAccessEntries[index+1].afraOffset : undefined;
			fragmentInformation.push(entry);
		}
	}
	
	return fragmentInformation;
};

var parseF4XBuffer = function(extendedBuffer, fragmentNumber) {
	'use strict';
	var headers, localRandomAccessEntries, globalRandomAccessEntries, fragmentInformation;
	extendedBuffer.resetIndex();
	
	headers = parseF4XHeaders(extendedBuffer);	
	localRandomAccessEntries = parseF4XLocalRandomAccessEntries(headers, extendedBuffer);
	globalRandomAccessEntries = parseF4XGlobalRandomAccessEntries(headers, extendedBuffer);
	fragmentInformation = extractF4XFragmentInformation(globalRandomAccessEntries, fragmentNumber);
	
	return {
		headers : headers,
		localRandomAccessEntries : localRandomAccessEntries,
		globalRandomAccessEntries : globalRandomAccessEntries,
		fragmentInformation : fragmentInformation
	};
};

// parse the f4x file the osmf-way
var parseF4X = function(f4xFile, callback) {
	'use strict';
	var fragmentNumber = parseInt(path.basename(f4xFile, '.f4x').match(/(\d+)$/)[0], 10);
	lfs.exists(f4xFile, function(exists) {
		if (exists) {
			lfs.stat(f4xFile, function(error, stats) {
				if (error) {
					return callback(error);
				}
			
				lfs.open(f4xFile, 'r', function(error, indexFile) {
					if (error) {
						return callback(error);
					}
					
					var buffer = new ExtendedBuffer(stats.size);
					lfs.read(indexFile, buffer, 0, buffer.length, null, function(error, bytesRead, buffer) {
						if (error) {
							return callback(error);
						}
						return callback(null, parseF4XBuffer(buffer, fragmentNumber));
					});
				});
			});
		}
	});
};

module.exports = parseF4X;