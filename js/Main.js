/**
 * Main script for Bandit Viewer
 * 
 * Version 1.0.
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

//A list of data to be highlighted at all times on the charts
//(used in flag simulation)
var alwaysHighlighted = [];
//The index of the selected data point (a data point is selected by clicking on it)
var selectedData;

//Load data once DOM has finished loading
$(document).ready(function() {
	updateBottomHalf();
	load();
});

//Load data based on selected dataset.
//Called whenever selected dataset is changed
function load() {
	//Clear view containers
	$('#svgContainer').html('');
	$('#visarContainer').html('');
	$('#diffractionContainer').html('');
	$('#diffractionImageContainer').html('');

	//Set selected tool to the Zoom/Pan tool if it isn't selected already
	if ($('#zoomTool').attr('mode') != 'selected') {
		$('.tool[mode="selected"]').attr('mode','unselected');
		$('#zoomTool').attr('mode','selected');
	}

	alwaysHighlighted = [];
	selectedData = null;

	dbName = d3.select('#database').node().value;
	console.log(dbName);

	chart = new ParallelCoordinatesChart(d3.select('#svgContainer'),dbName,[],doneLoading);

	diffractionChart = new LineChart(d3.select('#diffractionContainer'), getDiffData);

	diffractionImageDisplay = new TwoImageDisplay(d3.select('#diffractionImageContainer'));
	diffractionImageDisplay.setLeftImage("Ti-data/Ti-XRD-composite-images/output.jpg");
	diffractionImageDisplay.setRightImage("Ti-data/Ti-XRD-composite-images/output.jpg");

	if (dbName == "simresults/Al.design.1000.numbered.csv") {
		visarChart = new LineChart(d3.select('#visarContainer'), getVisarData2);
	}
	else {
		visarChart = new LineChart(d3.select('#visarContainer'), getVisarData);
	}
}

//Called when parallel coordinates chart finishes loading
function doneLoading() {
	chartLoaded = true;

	//Add listeners for chart
	chart.dispatch.on('selectionchange', onSelectionChange);
	chart.dispatch.on('mouseover', onMouseOverChange);
	chart.dispatch.on('click',onMouseClick);

	//Load data into visar and diffraction charts
	var resultIndices = Array.apply(null, Array(chart.results.length)).map(function (_, i) {return i;});
	diffractionChart.loadData(resultIndices, function() {
		diffractionChart.updateSize();
		diffractionChart.dispatch.on("mouseover", onMouseOverChange);
		diffractionChart.dispatch.on("click",onMouseClick);
		diffractionChart.dispatch.on("erase",onErase);
		diffractionChart.dispatch.on("include",onInclude);
	});
	visarChart.loadData(resultIndices, function() {
		visarChart.updateSize();
		visarChart.dispatch.on("mouseover", onMouseOverChange);
		visarChart.dispatch.on("click",onMouseClick);
		visarChart.dispatch.on("erase",onErase);
		visarChart.dispatch.on("include",onInclude);
	});
}

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
		diffractionChart.updateSize();
		visarChart.updateSize();
		diffractionImageDisplay.updateSize();
	});
d3.select('#resizeBar').call(resizeDrag);

//Set up switching the main view when a socket overlay is clicked
//(Jquery is used here because d3 does not allow for easily detaching and reattaching elements)
$('.socketOverlay')
	.on('click', function() {
		if ($(this).attr('mode') == 'filled') {
			var currentView = $('#mainViewSocket .viewContainer');
			var socketContents = $(this).parent().children('.viewContainer');
			//place current view back into its socket
			switch (currentView.attr('id')) {
				case "visarContainer":
					currentView.insertBefore('#visarSocketOverlay');
					$('#visarSocketOverlay').attr('mode','filled');
					visarChart.updateSize();
					break;
				case "diffractionContainer":
					currentView.insertBefore('#diffractionSocketOverlay');
					$('#diffractionSocketOverlay').attr('mode','filled');
					diffractionChart.updateSize();
					break;
				case "diffractionImageContainer":
					currentView.insertBefore('#diffractionImageSocketOverlay');
					$('#diffractionImageSocketOverlay').attr('mode','filled');
					diffractionImageDisplay.updateSize();
					$('#toolbar').slideDown(500);
					$('#resultsArea').animate({top: '65px'},callback=function() {
						if (socketContents.attr('id') == 'visarContainer')
							visarChart.updateSize();
						else
							diffractionChart.updateSize();
					});
			}
			//Place socket contents into main view
			$('#mainViewSocket').append(socketContents);
			$(this).attr('mode',"empty");
			switch (socketContents.attr('id')) {
				case "visarContainer":
					visarChart.updateSize();
					break;
				case "diffractionContainer":
					diffractionChart.updateSize();
					break;
				case "diffractionImageContainer":
					$('#toolbar').slideUp(500);
					$('#resultsArea').animate({top: '5px'},callback=function() {
						diffractionImageDisplay.updateSize();
					});
			}
		}
	});

//Set up switching between tools
$('.tool')
	.on('click', function() {
		if ($(this).attr('mode') == 'unselected') {
			$('.tool[mode="selected"]').attr('mode','unselected');
			$(this).attr('mode','selected');
			switch ($(this).attr('id')) {
				case "zoomTool":
					visarChart.setMode("zoom");
					diffractionChart.setMode("zoom");
					$('#tooltip').text("Scroll to zoom, click-and-drag to pan.");
					break;
				case "eraseTool":
					visarChart.setMode("erase");
					diffractionChart.setMode("erase");
					$('#tooltip').text("Drag over results to grey them out.");
					break;
				case "includeTool":
					visarChart.setMode("include");
					diffractionChart.setMode("include");
					$('#tooltip').text("Drag over erased results to see them again");
			}
		}
	})

//When window is resized, wait for a little bit
//before calling updateSize methods on charts.
//This keeps the methods from being called repeatedly
//while resizing the window.
//https://stackoverflow.com/a/5926068
var rtime;
var timeout = false;
var delta = 200;
$(window).resize(function() {
	rtime = new Date();
	if (timeout === false) {
		timeout = true;
		setTimeout(resizeend, delta);
	}
});
function resizeend() {
	if (new Date() - rtime < delta) {
		setTimeout(resizeend, delta);
	} else {
		timeout = false;
		chart.updateSize();
		diffractionChart.updateSize();
		visarChart.updateSize();
		diffractionImageDisplay.updateSize();
	}
}

//Called when selection in parallel coordinates chart changes.
//Sets selection in visar and diffraction charts
function onSelectionChange(query) {
	if (visarChart.dataLoaded)
		visarChart.setSelection(query);
	if (diffractionChart.dataLoaded)
		diffractionChart.setSelection(query);
}

//Called when either the visar or diffraction chart
//fires an erase event (a line is dragged over with the erase tool)
//Erases the data in the charts and greys it out in the parallel coordinates chart.
function onErase(i) {
	visarChart.eraseData(i);
	diffractionChart.eraseData(i);
	$('.pCoordChart .resultPaths path[index="'+i+'"]')
		.attr('mode','erased');
}

//Called when either the visar or diffraction chart
//fires an include event (an erased line is dragged over the include tool)
//Includes the data in the charts and recolors it in the parallel coordinates chart.
function onInclude(i) {
	visarChart.includeData(i);
	diffractionChart.includeData(i);
	$('.pCoordChart .resultPaths path[index="'+i+'"]')
		.attr('mode','active');
}

//Called when a data point in any chart is moused over.
//Sets the highlights in all charts accordingly.
function onMouseOverChange(i, event) {
	//The parallel coordiantes chart does the highlighting by itself,
	//so the highlight isn't called if the mouse over was triggered by it.
	if (this !== chart && chartLoaded) {
		chart.setHighlight(i);
	}

	if (i != null) {
		diffractionChart.setHighlight([selectedData].concat([i].concat(alwaysHighlighted)));
		visarChart.setHighlight([selectedData].concat([i].concat(alwaysHighlighted)));
		var images = getImages(i);
		diffractionImageDisplay.setLeftImage(images[0]);
		diffractionImageDisplay.setRightImage(images[1]);
	}
	else {//i is null when mousing over a blank area
		diffractionChart.setHighlight([selectedData].concat(alwaysHighlighted));
		visarChart.setHighlight([selectedData].concat(alwaysHighlighted));
		//Revert images to those of the selected data
		if (selectedData != null) {
			var images = getImages(selectedData);
			diffractionImageDisplay.setLeftImage(images[0]);
			diffractionImageDisplay.setRightImage(images[1]);
		}
	}
}

//Called whenever a data point in any chart is clicked on
//Sets the selected data and highlights it.
function onMouseClick(i, event) {
	selectedData = i;
	diffractionChart.setHighlight([selectedData].concat(alwaysHighlighted));
	visarChart.setHighlight([selectedData].concat(alwaysHighlighted));

	//Selected data is shown in the parallel coordinates chart using its overlay paths system.
	if (i != null)
		chart.overlayPathData = [{data: chart.results[i]}];
	else
		chart.overlayPathData = [];
	chart.updateOverlayPaths(true);
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

//Used by the diffraction chart to get data.
//Returns the data file for the data represented by the given index.
function getDiffData(i) {
	if (chartLoaded) {
		var id = chart.results[i].run;
		return [
			{file: "_1DSpectra/r" + pad(id,4) + "-e00000001-spectrum.txt", color: "blue", columnX: -1, columnY: -1},
			{file: "_1DSpectra/r" + pad(id,4) + "-e00000002-spectrum.txt", color: "red", columnX: -1, columnY: -1}];
	}

	return null;
}

//Used by the visar chart to get data.
//Returns the data file for the data represented by the given index.
function getVisarData(i) {
	if (chartLoaded) {
		var id = chart.results[i].run;
		return [
			{file: "visar/r" + pad(id,3) + "-visar.txt", color: "blue", columnX: -1, columnY: 0},
			{file: "visar/r" + pad(id,3) + "-visar.txt", color: "red", columnX: -1, columnY: 1}];
	}

	return null;
}

//Used by the visar chart to get data (for Flag simulation).
//Returns the data file for the data represented by the given index.
function getVisarData2(i) {
	if (chartLoaded) {
		var id = i+1;
		var experiment = chart.results[i].Experiment;
		if (experiment == 1) {
			alwaysHighlighted.push(i);
			return [{file: "Boetler-data/Data_S" + pad(chart.results[i].id,3) + "E.txt", color: "red", columnX: 3, columnY: 2}];
		}
		else {
			return [
				{file: "simresults/Shot104S_" + pad(id,3) + "_TitleAl5083.FreeSurface.000001", color: "blue", columnX: 1, columnY: 3, delimiter: " "}];
		}
	}

	return null;
}

//Get the filenames for diffraction images for the given data index.
function getImages(i) {
	var id = chart.results[i].run;
	diffractionChart.setHighlight([selectedData].concat([i].concat(alwaysHighlighted)));
	visarChart.setHighlight([selectedData].concat([i].concat(alwaysHighlighted)));
	if (dbName == "simresults/Al.design.1000.numbered.csv") {
		fileName = "Ti-data/Ti-XRD-composite-images/output.jpg";
		fileName2 = "Ti-data/Ti-XRD-composite-images/output.jpg";
	}
	else {
		var fileName = "Ti-data/Ti-XRD-composite-images/r"+ pad(id, 4) + "-e001-140506-Composite.tif.jpg";
		if (id >= 223 && id <= 372) {
			fileName = "Ti-data/Ti-XRD-composite-images/r"+ pad(id, 3) + "-e001-140506-Composite.tif.jpg";
		}
		var fileName2 = "Ti-data/Ti-XRD-composite-images/r"+ pad(id, 4) + "-e002-140506-Composite.tif.jpg";
		if (id >= 223 && id <= 372) {
			fileName2 = "Ti-data/Ti-XRD-composite-images/r"+ pad(id, 3) + "-e002-140506-Composite.tif.jpg";
		}
	}
	return [fileName,fileName2];
}