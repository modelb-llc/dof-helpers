var yaml = require('js-yaml');
var fs   = require('fs');
var Liquid = require('liquidjs');
var engine = Liquid();

var argv = require('minimist')(process.argv.slice(2));

// declare configurable variables with default values
var topComponentPath = process.cwd();
var outputDirName = 'dist';
var componentModel = 'component.yaml'
var templatePath = __dirname;
var templateName = 'assemblyInstructions.adoc.liquid'

// handle arguments
if (argv['h'] || argv['help']) {  // if asked for help, print it and exit
    console.log('Usage: node parseComponent.js [options]');
    console.log('--help, -h                                         Print the usage message and exit');
    console.log('--componentPath=<Path/To/Component/>               (default=CWD)');
    console.log('--outputDirName=<directory_to_write_output_files>  (default=dist)');
    console.log('--componentModel=<filename_of_component_model>     (default=component.yaml)');
	console.log('--templatePath=<Path/To/Templates/>                (default='+templatePath+')');
	console.log('--templateName=<template_filename>                 (default='+templateName+')');
    process.exit();
} else { // otherwise process arguments
    if ('componentPath' in argv) 
        topComponentPath = argv['componentPath'];
    
    if ('outputDirName' in argv)
        outputDirName = argv['outputDirName'];
    
    if ('componentModel' in argv)
        componentModel = argv['componentModel'];
	
	if ('templatePath' in argv)
        templatePath = argv['templatePath'];
	
	if ('templateName' in argv)
        templateName = argv['templateName'];
}

var topComponent = yaml.safeLoad(fs.readFileSync(topComponentPath + "/" + outputDirName + "/" + componentModel, 'utf8'));

var instructionsList = [];

function processComponent(component) {
	if (component.assemblySteps.length > 0) {
		component.numTools = Object.getOwnPropertyNames(component.tools).length;
		component.numParts = Object.getOwnPropertyNames(component.parts).length;
		instructionsList.push(component);
		component.hasPrecautions = component.precautions.length > 0;
	}
	
	for (var part in component.parts) {  // TODO: reverse the order of this loop
		if(component.parts.hasOwnProperty(part)) {
			var selectedComponentID = component.parts[part].options[component.parts[part].selectedOption];
			component.hasPrecautions = component.hasPrecautions || component.components[selectedComponentID].precautions.length > 0;
			processComponent(component.components[selectedComponentID]);
		}
	}
	
	for (var tool in component.tools) {  // TODO: reverse the order of this loop
		if(component.tools.hasOwnProperty(tool)) {
			var selectedComponentID = component.tools[tool].options[component.tools[tool].selectedOption];
			component.hasPrecautions = component.hasPrecautions || component.components[selectedComponentID].precautions.length > 0;
			processComponent(component.components[selectedComponentID]);
		}
	}
}

processComponent(topComponent);
instructionsList.reverse();

var data = {};
data.generationDate = new Date().toLocaleDateString("en-US", {
    "year": "numeric",
    "month": "numeric",
    "day": "numeric"
    });
data.topComponent = topComponent;
data.components = instructionsList;

var templateFile = fs.readFileSync(templatePath + '/' + templateName, 'utf8');
engine
    .parseAndRender(templateFile, data)
    .then(function(fulfilled) {
        fs.writeFileSync(outputDirName + '/assemblyInstructions.adoc', fulfilled);
    }).catch(function(e) {
        console.log(e);
    });