//'use strict';
/**
 * Main script for Bandit Viewer
 * 
 * Version 1.1.
 * 
 * 
 * Requires:
 * d3 v4
 * jQuery
 * ParallelCoordinatesChart.js
 * LineChart.js
 * TwoImageDisplay.js
 * 
 * Author: Dan Orban
 * Author: Cameron Tauxe
 */

//Init variables
var chartLoaded = false;
var chart;//parallel coordinates chart
var diffractionChart;
var diffractionImageDisplay;
var visarChart;
var database;


// colors
var Visar_second = "red";
var Visar_first  = "blue";
var Highlight    = "blue";

var databases;
//Currently loaded database
var db;

//A list of data to be highlighted at all times on the charts
//(used in flag simulation)
var alwaysHighlighted = [];
//The index of the selected data point (a data point is selected by clicking on it)
var selectedData;

var rtime;
var timeout = false;
var delta = 200;

var refreshBySizeInterval = false;
var refreshAllInterval = false;

var displays = [];

//Load databases.json and register databases into the database selection
//Then load the first one
var jsonRequest = new XMLHttpRequest();
jsonRequest.open("GET",'databases.json',true);
jsonRequest.onreadystatechange = function() {
	if (jsonRequest.readyState === 4) {
		if (jsonRequest.status === 200 || jsonRequest.status === 0) {
			databases = JSON.parse(jsonRequest.responseText);
			d3.select('#database').selectAll('option')
				.data(databases)
				.enter().append('option')
					.attr('value',function(d,i){return i;})
					.text(function(d) {
						return d.name ? d.name: d.directory;
					});
			load();
		}
	}
}

//Load data once DOM has finished loading
$(document).ready(function() {
});

function startBandit() {
	//Set up dragging on the resize bar
	var resizeDrag = d3.drag()
		.on('start', function() {
			d3.select(this).attr('mode', 'dragging');
		})
		.on('drag', function() {
			var headerRect = d3.select('#header').node().getBoundingClientRect();
			d3.select('#svgArea').style('height',(d3.event.y - headerRect.height)+'px');
			updateBottomHalf();
		})
		.on('end', function() {
			d3.select(this).attr('mode', 'default');
			chart.updateSize();
			for (var f = 0; f < displays.length; f++) {
				displays[f].updateSize();
			}
		});
	d3.select('#resizeBar').call(resizeDrag);	

	//Set up switching between tools
	$('.tool')
		.on('click', function() {
			if ($(this).attr('mode') == 'unselected') {
				$('.tool[mode="selected"]').attr('mode','unselected');
				$(this).attr('mode','selected');
				switch ($(this).attr('id')) {
					case "zoomTool":
						for (var f = 0; f < displays.length; f++) {
							if (db.info[f].type == "line") {
								displays[f].setMode("zoom");
							}
						}
						$('#tooltip').text("Scroll to zoom, click-and-drag to pan.");
						break;
					case "eraseTool":
						for (var f = 0; f < displays.length; f++) {
							if (db.info[f].type == "line") {
								displays[f].setMode("erase");
							}
						}
						$('#tooltip').text("Drag over results to grey them out.");
						break;
					case "includeTool":
						for (var f = 0; f < displays.length; f++) {
							if (db.info[f].type == "line") {
								displays[f].setMode("include");
							}
						}
						$('#tooltip').text("Drag over erased results to see them again");
				}
			}
		})

	//When window is resized, wait for a little bit
	//before calling updateSize methods on charts.
	//This keeps the methods from being called repeatedly
	//while resizing the window.
	//https://stackoverflow.com/a/5926068
	$(window).resize(function() {
		rtime = new Date();
		if (timeout === false) {
			timeout = true;
			setTimeout(resizeend, delta);
		}
	});

	updateBottomHalf();
	jsonRequest.send(null);
}

//Load data based on selected dataset.
//Called whenever selected dataset is changed
function load() {
	chartLoaded = false;
	//Clear view containers
	$('#svgContainer').html('');
	$('#visarContainer').html('');
	$('#diffractionContainer').html('');
	$('#diffractionImageContainer').html('');
	$('#sidebar').html('');

	$('#toolbar').slideUp(500);

	//Reset view
	$('#diffractionSocketOverlay').attr('mode','disabled');
	$('#visarSocketOverlay').attr('mode','disabled');
	$('#diffractionImageSocketOverlay').attr('mode','disabled');
	//var currentView = 
	$('#mainViewSocket').html('');
	d3.select('#mainViewSocket').attr('class','socket');
	/*switch (currentView.attr('id')) {
		case "visarContainer":
			currentView.insertBefore('#visarSocketOverlay');
			break;
		case "diffractionContainer":
			currentView.insertBefore('#diffractionSocketOverlay');
			break;
		case "diffractionImageContainer":
			currentView.insertBefore('#diffractionImageSocketOverlay');
			//$('#toolbar').slideDown(500);
			//$('#resultsArea').animate({top: '65px'});
			break;
	}*/

	//Set selected tool to the Zoom/Pan tool if it isn't selected already
	if ($('#zoomTool').attr('mode') != 'selected') {
		$('.tool[mode="selected"]').attr('mode','unselected');
		$('#zoomTool').attr('mode','selected');
	}

	alwaysHighlighted = [];
	selectedData = null;

	db = databases[$('#database').get(0).value];

	/*chart = new ParallelCoordinatesChart(d3.select('#svgContainer'),
										db.directory+'/data.csv',
										filter,
										doneLoading);*/
	//First create a database
	database = new CINEMA_COMPONENTS.Database(db.directory,doneLoading, null);
}

//Called when parallel coordinates chart finishes loading
function doneLoading() {
	chartLoaded = true;

	var sidebar = d3.select('#sidebar');

	if (!db.info) {
		var files = database.dimensions.filter(function(d) {
            return (/^FILE/).test(d);
        });

        var prevTitle = '';
        var prevFileName = '';
        db.info = [];
        var currentInfo = null;
        files.forEach(function(file) {
        	var title = file.substring(5, file.length-2).replace("_"," ");
        	var fileName = database.data[0][file];
        	var isLine = fileName.endsWith(".csv") || fileName.endsWith(".txt");

        	if (!(prevTitle === title)) {
        		currentInfo = {name: title, type: isLine ? "line" : "image", data: []};
        		db.info.push(currentInfo);
        	}
        	if (isLine) {
        		currentInfo.data.push({column: file, xcol:0, ycol:1, delimiter: fileName.endsWith(".csv") ? "," : null });
	        	if (prevFileName === fileName) {
	        		currentInfo.data.forEach(function(item, index){
	        			item.xcol = -1;
	        			item.ycol = index;
	        		});
	        	}
        	}
        	else {
        		currentInfo.data.push(file);
        	}
        	
        	prevTitle = title;
        	prevFileName = fileName;
        });
	}

	for (var f = 0; f < db.info.length; f++) {
		var item = db.info[f];
		var socketContainer = sidebar.append('div')
			.attr('class','sidebarThird')
			.attr('id','SocketContainer'+f);
		socketContainer.append('span')
			.text(item.name);
		var socket = socketContainer.append('div')
			.attr('class','socket')
			.attr('id','Socket'+f);
		socket.append('div')
			.attr('class','viewContainer')
			.attr('id','Container'+f);
		socket.append('div')
			.attr('class','socketOverlay')
			.attr('id','SocketOverlay'+f);
	}

	//Set up switching the main view when a socket overlay is clicked
	//(Jquery is used here because d3 does not allow for easily detaching and reattaching elements)
	$('.socketOverlay')
		.on('click', function() {
			if ($(this).attr('mode') == 'filled') {
				var currentView = $('#mainViewSocket .viewContainer');
				var socketContents = $(this).parent().children('.viewContainer');


				//place current view back into its socket
				var currentViewId = currentView.attr('id');
				if (currentViewId) {
					var displayId = currentViewId[currentViewId.length-1];
					currentView.insertBefore('#SocketOverlay'+displayId);
					$('#SocketOverlay' + displayId).attr('mode','filled');
					displays[displayId].updateSize();
				}
				
				//Place socket contents into main view
				$('#mainViewSocket').append(socketContents);
				$(this).attr('mode',"empty");

				var socketId = socketContents.attr('id');
				socketId = socketId[socketId.length-1]
				if (db.info[socketId].type == "line") {
					displays[socketId].updateSize();
				}
				else if (db.info[socketId].type == "image") {
					displays[socketId].updateSize();
					/*$('#toolbar').slideUp(500);
					$('#resultsArea').animate({top: '5px'},callback=function() {
					});*/
				}
			}
		});

	var filter = [];

	chart = new CINEMA_COMPONENTS.PcoordSVG($('#svgContainer')[0], database,/FILE*/);

	chart.results = database.data;

	//Add listeners for chart
	chart.dispatch.on('selectionchange', onSelectionChange);
	chart.dispatch.on('mouseover', onMouseOverChange);
	chart.dispatch.on('click',onMouseClick);

	//Monitor database for data updates
	database.dispatch.on('dataUpdated', onDataUpdated);
	// Create two intervals.  Every 5 seconds we see if the file size has changed
	// and every 30 seconds, we load the full data to see if anything has changed.
	refreshBySizeInterval = d3.interval(function(duration) {
		database.refreshData(false);
	}, 5*1000);
	refreshAllInterval = d3.interval(function(duration) {
		database.refreshData(true);
	}, 30*1000);

	//Create charts for data
	var resultIndices = Array.apply(null, Array(chart.results.length)).map(function (_, i) {return i;});

	displays = [];

	for (var f = 0; f < db.info.length; f++) {
		if (db.info[f].type == "line") {
			var display = new LineChart(d3.select('#Container'+f), getLineData, db.info[f]);
			display.loadData(resultIndices);
			display.dispatch.on("mouseover", onMouseOverChange);
			display.dispatch.on("click",onMouseClick);
			display.dispatch.on("erase",onErase);
			display.dispatch.on("include",onInclude);
			$('#SocketOverlay'+f).attr('mode','filled');
			displays.push(display);
		}
		else if (db.info[f].type == "image") {
			var display = new TwoImageDisplay(d3.select('#Container'+f));
			displays.push(display);
			$('#SocketOverlay'+f).attr('mode','filled');
		}
		//AQ - Add ability to look at just a single image
		else if (db.info[f].type == "image-single") {
			var display = new SingleImageDisplay(d3.select('#Container'+f));
			displays.push(display);
			$('#SocketOverlay'+f).attr('mode','filled');
		}
	}
}

function onDataUpdated(updateInfo) {
	chart.updateData();
	chart.results = database.data;

	if (updateInfo.added.length > 0) {
		for (var f = 0; f < displays.length; f++) {
			if (db.info[f].type == "line") {
				displays[f].loadData(updateInfo.added);
			}
		}
		chart.updateSelection(true);
	}
}

function resizeend() {
	if (new Date() - rtime < delta) {
		setTimeout(resizeend, delta);
	} else {
		timeout = false;
		chart.updateSize();
		for (var f = 0; f < displays.length; f++) {
			displays[f].updateSize();
		}
	}
}

//Called when selection in parallel coordinates chart changes.
//Sets selection in visar and diffraction charts
function onSelectionChange(query) {
	for (var f = 0; f < displays.length; f++) {
		if (db.info[f].type == "line") {
			displays[f].setSelection(query);
		}
	}
}

//Called when either the visar or diffraction chart
//fires an erase event (a line is dragged over with the erase tool)
//Erases the data in the charts and greys it out in the parallel coordinates chart.
function onErase(i) {
	if (visarChart)
		visarChart.eraseData(i);
	if (diffractionChart)
		diffractionChart.eraseData(i);
	$('.pCoordChart .resultPaths path[index="'+i+'"]')
		.attr('mode','erased');
}

//Called when either the visar or diffraction chart
//fires an include event (an erased line is dragged over the include tool)
//Includes the data in the charts and recolors it in the parallel coordinates chart.
function onInclude(i) {
	if (visarChart)
		visarChart.includeData(i);
	if (diffractionChart)
		diffractionChart.includeData(i);
	$('.pCoordChart .resultPaths path[index="'+i+'"]')
		.attr('mode','active');
}

//Called when a data point in any chart is moused over.
//Sets the highlights in all charts accordingly.
function onMouseOverChange(i, event) {
	//The parallel coordiantes chart does the highlighting by itself,
	//so the highlight isn't called if the mouse over was triggered by it.
	var highlightedPaths = [];
	if (i) {
		highlightedPaths = highlightedPaths.concat([i]);
	}
	if (selectedData) {
		highlightedPaths = highlightedPaths.concat([selectedData]);
	}


	if (chartLoaded) {
		chart.setHighlightedPaths(highlightedPaths);
	}

	if (i != null) {
		for (var f = 0; f < displays.length; f++) {
			if (db.info[f].type === "line") {
				displays[f].setHighlight([selectedData].concat([i].concat(alwaysHighlighted)));
			}
			else if (db.info[f].type === "image") {
				var images = getImages(i, db.info[f]);
				displays[f].setLeftImage(images[0]);
				displays[f].setRightImage(images[1]);
			}
			//AQ - Add section for single image
			else if (db.info[f].type === "image-single") {
				var images = getImage(i, db.info[f]);
				displays[f].setImage(images[0]);
			}
		}
	}
	else {//i is null when mousing over a blank area
		for (var f = 0; f < displays.length; f++) {
			if (db.info[f].type === "line") {
				displays[f].setHighlight([selectedData].concat(alwaysHighlighted));
			}
			else if (db.info[f].type === "image" && selectedData != null) {
				var images = getImages(selectedData, db.info[f]);
				displays[f].setLeftImage(images[0]);
				displays[f].setRightImage(images[1]);
			}
			//AQ - Add section for single image
			else if (db.info[f].type === "image-single" && selectedData != null) {
				var images = getImage(selectedData, db.info[f]);
				displays[f].setImage(images[0]);
			}
		}
	}

	updateInfoPane(i, event);
}

//Called whenever a data point in any chart is clicked on
//Sets the selected data and highlights it.
function onMouseClick(i, event) {
	selectedData = i;

	for (var f = 0; f < displays.length; f++) {
		if (db.info[f].type == "line") {
			displays[f].setHighlight([selectedData].concat(alwaysHighlighted));
		}
	}

	//Selected data is shown in the parallel coordinates chart using its overlay paths system.
	if (i != null)
		chart.overlayPathData = [{data: chart.results[i]}];
	else
		chart.overlayPathData = [];

	updateInfoPane(i, event);

	chart.setHighlightedPaths([i]);
	//chart.updateOverlayPaths(true);

}

//Called when the size of the top part of the screen is changed.
//Readjusts the margins on the bottom part to fit.
function updateBottomHalf() {
	var topRect = $('#topHalf').get(0).getBoundingClientRect();
	$('#bottomHalf').css('top',topRect.height+'px');
}

//Convenience function. Formats a number with preceeding zeroes
//Used by getData methods
function pad(num, size){ return ('000000000' + num).substr(-size); }

//Used by the visar chart to get data.
//Returns the data file for the data represented by the given index.
function getLineData(i, config) {
	if (chartLoaded) {
		var result = chart.results[i];
		var data = [];
		var itemInfo = config.data;
		for (var f = 0; f < itemInfo.length; f++) {
			var color = f == 0 ? Visar_first : Visar_second
			data.push({file: db.directory+'/'+result[itemInfo[f].column], color: color, 
						columnX:itemInfo[f].xcol, columnY:itemInfo[f].ycol, delimiter:itemInfo[f].delimiter/*, bgcolor: color*/});
		}

		return data;
	}
	return null;
}

//Get the filenames for diffraction images for the given data index.
function getImages(i, config) {
	if (chartLoaded) {
		var result = chart.results[i];
		var itemInfo = config.data;
		var data = [];
		for (var f = 0; f < itemInfo.length; f++) {
			data.push(db.directory + "/" + result[itemInfo[f]]);
		}

		return data;
	}
}

//Get filename for a single diffraction image, at the given data index.
function getImage(i, config) {
	if (chartLoaded) {
		var result = chart.results[i];
		var itemInfo = config.data;
		var data = [];
		data.push(db.directory + "/" + result[itemInfo]);
		return data;
	}
}

//Update the info pane according to the index of the data
//being moused over
function updateInfoPane(index, event) {
	if (!index) {
		d3.select('.infoPane').remove();
		index = selectedData;
	}
	var pane = d3.select('.infoPane');
	if (index != null && pane.empty()) {
		pane = d3.select('body').append('div')
			.attr('class', 'infoPane')
	}
	if (index != null) {
		pane.html(function() {
				var text = '';
				var data = database.data[index]
				for (i in data) {
					if (!i.startsWith("FILE")) {
						text += ('<b>'+i+':</b> ');
						text += (data[i] + '<br>');
					}
				}
				return text;
			});
		//Draw the info pane in the side of the window opposite the mouse
		var leftHalf = (event.clientX <= window.innerWidth/2)
		if (leftHalf)
			pane.style('right', '30px');
		else
			pane.style('left', '30px');
	}
	else {
		d3.select('.infoPane').remove();
	}
}
