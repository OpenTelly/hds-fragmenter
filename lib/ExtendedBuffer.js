var util = require('util');

var ExtendedBuffer = function(str, encoding) {
	'use strict';
	var self, index;
	
	self = new Buffer(str, encoding);
	index = 0;
	
	// Read <length> bytes as a unint
	self.readUnsignedBytes = function(length) {
		var result, i;
		result = 0;
		
		for(i = 0; i < length; i += 1) {
			result = (result << 8);
			result += this.readUnsignedByte();
		}
		return result;
	};

	// Read <length> bytes as a utf8 string
	self.readUTFBytes = function(length) {
		var result = this.toString('utf-8', index, index + length);
		index += length;
		return result;
	};

	// Read 4 bytes as a uint
	self.readUnsignedInt = function() {
		var result = this.readUInt32BE(index);
		index += 4;
		return result;
	};

	// Read 1 byte as a uint
	self.readUnsignedByte = function() {
		var result = this.readUInt8(index);
		index += 1;
		return result;
	};

	// Read 8 bytes as a uint
	self.readLongUnsignedInt = function() {
		return this.readUnsignedBytes(8);
	};
	
	self.resetIndex = function() {
		index = 0;
	};
	
	return self;
};

util.inherits(ExtendedBuffer, Buffer);
module.exports = ExtendedBuffer;