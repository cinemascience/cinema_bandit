
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
var imageDisplays = [];
var visarChart;
var slider;
var sliderText;

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
	updateBottomHalf();
	jsonRequest.send(null);
});

//Load data based on selected dataset.
//Called whenever selected dataset is changed
function load() {
	chartLoaded = false;
	//Clear view containers
	$('#svgContainer').html('');
	$('#visarContainer').html('');
	$('#diffractionContainer').html('');


	$('#toolbar').slideUp(500);

	//Reset view
	$('#diffractionSocketOverlay').attr('mode','disabled');
	$('#visarSocketOverlay').attr('mode','disabled');
	var currentView = $('.viewContainer');
	currentView.html('');
	$.each(currentView, function(index, item){
		var keys = d3.select(item).attr("id").split("_");
		if (keys.length > 1 && keys[1] == "image") {
			imageDisplays.push({
				key: keys[0] + "_" + keys[1]
			});
		}
	});

	imageDisplays.forEach(function(item) {
		$('#'+item.key+'_SocketOverlay').attr('mode','disabled');
	});

	switch (currentView.attr('id')) {
		case "visarContainer":
			currentView.insertBefore('#visarSocketOverlay');
			break;
		case "diffractionContainer":
			currentView.insertBefore('#diffractionSocketOverlay');
			break;
/*		case "diffraction_image_Container":
			currentView.insertBefore('#diffraction_image_SocketOverlay');
			//$('#toolbar').slideDown(500);
			//$('#resultsArea').animate({top: '65px'});
			break;*/
	}

	imageDisplays.forEach(function(item) {
		if (currentView.attr('id') == '#'+item.key+'_Container') {
			currentView.insertBefore('#'+item.key+'_SocketOverlay');
		}
	});

	//Set selected tool to the Zoom/Pan tool if it isn't selected already
	if ($('#zoomTool').attr('mode') != 'selected') {
		$('.tool[mode="selected"]').attr('mode','unselected');
		$('#zoomTool').attr('mode','selected');
	}

	alwaysHighlighted = [];
	selectedData = null;

	db = databases[$('#database').get(0).value];
	console.log(db.name);

	//Ignore data urls and options in chart
	var filter = ['Comments','Sample','visar_file','visar_file1','visar_file2',
				'visar_xCol','visar_yCol','visar1_xCol','visar1_yCol',
				'visar2_xCol','visar2_yCol','visar_delimiter',
				'diffraction_file','diffraction_file1','diffraction_file2',
				'diffraction_xCol','diffraction_yCol','diffraction1_xCol','diffraction1_yCol',
				'diffraction2_xCol','diffraction2_yCol','diffraction_delimiter'];

	imageDisplays.forEach(function(item) {
		filter.push(item.key);
	})

	chart = new ParallelCoordinatesChart(d3.select('#svgContainer'),
										db.directory+'/data.csv',
										filter,
										doneLoading);
}

function performSelectionUpdate(saveSelected, i) {
    var val =  chart.results[i != null ? i : selectedData]["Run #"];
    sliderText.property("value", val);
    if (i == null) {
	slider.property("value", selectedData);
    }
    if (saveSelected) {
              selectedData = i;
	chart.overlayPathData = [{data: chart.results[i]}];
	chart.updateOverlayPaths(true);
    }
    updateSelected(i);
}

//Called when parallel coordinates chart finishes loading
function doneLoading() {
    d3.select("#sliderContainer").html("");
    var sliderDiv = d3.select("#sliderContainer").append("div");
					
					slider = sliderDiv.append("div")
			   			.append("input")
			   				.attr("type","range")
			   				.attr("min", "0")
			   				.attr("max", chart.results.length - 1)
			   				.property("value", "0")
			   				.style("float", "left")
			   				.style("width", "70%");
			   		sliderText = sliderDiv.append("input")
			   				.attr("type","text")
			   				.attr("value", chart.results[0]["Run #"])
			   				.style("width", "40px")
			   				.on("input", function() {
//			   					var index = chart.results[+this.value]["Run #"];
//			   					slider.property("value", index);
			   				});

			   		slider.on("input", function() {
			   				performSelectionUpdate(true, +this.value);
		   					//query[key] = val;
		   					//updateResults();
			   			});

        slider.property("value",chart.results.length - 1);
        slider.dispatch("input");

	chartLoaded = true;

	//Add listeners for chart
	chart.dispatch.on('selectionchange', onSelectionChange);
	chart.dispatch.on('mouseover', onMouseOverChange);
	chart.dispatch.on('click',onMouseClick);

	//Create charts for data
	var resultIndices = Array.apply(null, Array(chart.results.length)).map(function (_, i) {return i;});

	//Create Visar chart if visar data is present
	if (chart.results[0].visar_file || chart.results[0].visar_file1 || chart.results[0].visar_file2) {
		visarChart = new LineChart(d3.select('#visarContainer'), getVisarData);
		visarChart.loadData(resultIndices);
		visarChart.dispatch.on("mouseover", onMouseOverChange);
		visarChart.dispatch.on("click",onMouseClick);
		visarChart.dispatch.on("erase",onErase);
		visarChart.dispatch.on("include",onInclude);
		$('#visarSocketOverlay').attr('mode','filled');
	}

	//Create diffraction chart if data is present
	if (chart.results[0].diffraction_file || chart.results[0].diffraction_file1 || chart.results[0].diffraction_file2) {
		diffractionChart = new LineChart(d3.select('#diffractionContainer'), getDiffData);
		diffractionChart.loadData(resultIndices);
		diffractionChart.updateSize();
		diffractionChart.dispatch.on("mouseover", onMouseOverChange);
		diffractionChart.dispatch.on("click",onMouseClick);
		diffractionChart.dispatch.on("erase",onErase);
		diffractionChart.dispatch.on("include",onInclude);
		$('#diffractionSocketOverlay').attr('mode','filled');
	}


	//Create diffraction images display if data is present
	//if (chart.results[0].diffraction_image || chart.results[0].diffraction_image1 || chart.results[0].diffraction_image2) {

	imageDisplays.forEach(function(display) {
		var numImages = 0;
		while ((display.key + numImages) in chart.results[0])
		{
			numImages++;
		}

		if (numImages > 0) {
			display.display = new TwoImageDisplay(d3.select('#' + display.key + '_Container'), numImages);
			$('#' + display.key + '_SocketOverlay').attr('mode','filled');
		}
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
		if (diffractionChart)
			diffractionChart.updateSize();
		if (visarChart)
			visarChart.updateSize();
		imageDisplays.forEach(function(display) {
			display.display.updateSize();
		});
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
				/*case "diffraction_image_Container":
					currentView.insertBefore('#diffraction_image_SocketOverlay');
					$('#diffraction_image_SocketOverlay').attr('mode','filled');
					diffraction_image_Display.updateSize();*/
					/*$('#toolbar').slideDown(500);
					$('#resultsArea').animate({top: '65px'},callback=function() {
						if (socketContents.attr('id') == 'visarContainer')
							visarChart.updateSize();
						else
							diffractionChart.updateSize();
					});*/
			}


			imageDisplays.forEach(function(item) {
				if (currentView.attr("id") == item.key + "_Container") {
					currentView.insertBefore('#'+item.key+'_SocketOverlay');
					$('#'+item.key+'_SocketOverlay').attr('mode','filled');
					item.display.updateSize();
				}
			});

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
				/*case "diffraction_image_Container":
					$('#toolbar').slideUp(500);
					$('#resultsArea').animate({top: '5px'},callback=function() {
						imageDisplays.forEach(function(item) {
							if (item.display) {
								item.display.updateSize();
							}
						});
					});*/
			}

			imageDisplays.forEach(function(item) {
				$('#toolbar').slideUp(500);
				$('#resultsArea').animate({top: '5px'},callback=function() {
						if (item.display) {
							item.display.updateSize();
						}
				});
			});
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
					if (visarChart)
						visarChart.setMode("zoom");
					if (diffractionChart)
						diffractionChart.setMode("zoom");
					$('#tooltip').text("Scroll to zoom, click-and-drag to pan.");
					break;
				case "eraseTool":
					if (visarChart)
						visarChart.setMode("erase");
					if (diffractionChart)
						diffractionChart.setMode("erase");
					$('#tooltip').text("Drag over results to grey them out.");
					break;
				case "includeTool":
					if (visarChart)
						visarChart.setMode("include");
					if (diffractionChart)
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
		if (diffractionChart)
			diffractionChart.updateSize();
		if (visarChart)
			visarChart.updateSize();
		imageDisplays.forEach(function(display) {
			display.display.updateSize();
		});
	}
}

//Called when selection in parallel coordinates chart changes.
//Sets selection in visar and diffraction charts
function onSelectionChange(query) {
	if (visarChart)
		visarChart.setSelection(query);
	if (diffractionChart)
		diffractionChart.setSelection(query);
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
    //updateSelected(i);
    slider.property("value",i);
    //slider.dispatch("input");
    performSelectionUpdate(false, i);
}

function updateSelected(i) {
	//The parallel coordiantes chart does the highlighting by itself,
	//so the highlight isn't called if the mouse over was triggered by it.
	if (this !== chart && chartLoaded) {
		chart.setHighlight(i);
	}

	if (i != null) {
		if (diffractionChart)
			diffractionChart.setHighlight([selectedData].concat([i].concat(alwaysHighlighted)));
		if (visarChart)
			visarChart.setHighlight([selectedData].concat([i].concat(alwaysHighlighted)));

		imageDisplays.forEach(function(display) {
			if (display.display) {
				var images = getImages(i, display.key, display.display.numImages);
				for (var f = 0; f < display.display.numImages; f++) {
					display.display.setImage(f, images[f]);
				}
			}
		});
		
	}
	else {//i is null when mousing over a blank area
		if (diffractionChart)
			diffractionChart.setHighlight([selectedData].concat(alwaysHighlighted));
		if (visarChart)
			visarChart.setHighlight([selectedData].concat(alwaysHighlighted));
		//Revert images to those of the selected data

		imageDisplays.forEach(function(display) {
			if (selectedData != null && display.display) {
				var images = getImages(selectedData, display.key, display.display.numImages);
				for (var f = 0; f < display.display.numImages; f++) {
					display.display.setImage(f, images[f]);
				}
			}
		});
	}
}

//Called whenever a data point in any chart is clicked on
//Sets the selected data and highlights it.
function onMouseClick(i, event) {
	selectedData = i;
	if (diffractionChart)
		diffractionChart.setHighlight([selectedData].concat(alwaysHighlighted));
	if (visarChart)
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
		var result = chart.results[i];
		var data = [];
		if (result.diffraction_file)
			data.push({file: db.directory+'/'+result.diffraction_file, color: Highlight, 
						columnX:result.diffraction_xCol, columnY:result.diffraction_yCol,delimiter:result.diffraction_delimiter});
		else if (result.diffraction_file1) {
			data.push({file: db.directory+'/'+result.diffraction_file1, color: Visar_first,
						columnX:result.diffraction1_xCol, columnY:result.diffraction1_yCol,delimiter:result.diffraction_delimiter});
		}
		if (result.diffraction_file2)
				data.push({file: db.directory+'/'+result.diffraction_file2, color: Visar_second,
						columnX:result.diffraction2_xCol, columnY:result.diffraction2_yCol,delimiter:result.diffraction_delimiter});
		return data;
	}

	return null;
}

//Used by the visar chart to get data.
//Returns the data file for the data represented by the given index.
function getVisarData(i) {
	if (chartLoaded) {
		var result = chart.results[i];
		var data = [];
		if (result.visar_file)
			data.push({file: db.directory+'/'+result.visar_file, color: Highlight, 
						columnX:result.visar_xCol, columnY:result.visar_yCol,delimiter:result.visar_delimiter});
		else if (result.visar_file1) {
			data.push({file: db.directory+'/'+result.visar_file1, color: Visar_first, 
						columnX:result.visar1_xCol, columnY:result.visar1_yCol,delimiter:result.visar_delimiter});
		}
		if (result.visar_file2)
				data.push({file: db.directory+'/'+result.visar_file2, color: Visar_second, 
						columnX:result.visar2_xCol, columnY:result.visar2_yCol,delimiter:result.visar_delimiter});
		return data;
	}
	return null;
}

//Get the filenames for diffraction images for the given data index.
function getImages(i, imageName, numImages) {
	if (chartLoaded) {
		var result = chart.results[i];
		var images = [];
		for (var f = 0; f < numImages; f++) {
			images.push(db.directory + "/" + result[imageName + f]);
		}

		return images;
	}
}
