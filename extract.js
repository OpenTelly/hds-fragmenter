'use strict';
var f4fExtract = require('./lib/f4f-fragment-extractor');
var optimist = require('optimist')
	.usage('Processes segments belonging to a given HDS manifest and extract the individual fragments.\nUsage: $0 -i <manifest file> [-o <output directory>] ')
	.options('i', {
        alias : 'input',
        describe : 'The manifest file for which to extract the fragments.',
		string : true
    })
	.options('o', {
        alias : 'output',
        describe : 'The output directory to write the fragments to. If none is given, the output will be written to the current directory.',
		string : true
    });

var argv = optimist.argv;

if(argv.input) {
	f4fExtract(argv.input, argv.output || '.', function(error) {
		if (error) {
			return console.error(error);
		}
		
		console.log('Fragments extracted');
	});
} else {
	console.log(optimist.help());
}