//'use strict';
/**
 * A component for viewing many data points all on a single graph.
 * Allows for zooming, filtering the selection of data, and erasing
 * data points to see more easily.
 * 
 * Requires d3 v4
 * 
 * Author: Dan Orban
 * Author: Cameron Tauxe
 */

var BaseLineColor = "grey";

//Create a new line chart and append it to the given parent.
//Uses function provided by getData to retrieve data files when loading
function LineChart(parent, getData, config) {

	//Sizing
	this.parent = parent;
	this.margin = {top: 30, right: 10, bottom: 30, left: 60};
	this.parentRect = parent.node().getBoundingClientRect();
	this.internalWidth = this.parentRect.width - this.margin.left - this.margin.right;
	this.internalHeight = this.parentRect.height - this.margin.top - this.margin.bottom;

	//Data
	this.shownData = [];//shown lines
	this.hiddenData = [];//greyed-out lines
	this.highlightData = [];//highlighted lines

	this.mode = "zoom";

	//Scales
	this.x = d3.scaleLinear().range([0,this.internalWidth]);
	this.y = d3.scaleLinear().range([this.internalHeight,0]);
	this.currentX = d3.scaleLinear().range(this.x.range());
	this.currentY = d3.scaleLinear().range(this.y.range());
	this.idCanvasX = d3.scaleLinear().range([0,1000]);
	this.idCanvasY = d3.scaleLinear().range([1000,0]);

	//Axes
	this.xAxis = d3.axisBottom(this.x);
	this.yAxis = d3.axisLeft(this.y);

	//Zooming and dragging
	//Zoom is applied to the canvasStack and works when in zoom mode.
	//Dragging is applied to a mask placed over the canvas stack when in erase or include modes
	var self = this;
	this.zoomBehavior = d3.zoom()
		.scaleExtent([1,20])
		.on('zoom',function() {
			self.zoom(d3.event.transform);
		});
	this.eraseIncludeDrag = d3.drag()
		.on('drag', function() {
			self.drag(d3.event);
		})

	//Create contents
	this.contents = parent.append('div')
		.attr('class','lineChart');

	//Create axis svgs
	this.xAxisSvg = this.contents.append('div')
		.attr('class','axisWrapper')
		.style('height',this.margin.bottom+'px')
		.style('position','absolute')
		.style('left',this.margin.left+'px')
		.style('bottom',0)
		.style('right',this.margin.right+'px')
		.append('svg')
			.attr('class','axis')
			.attr('id','xAxis')
			.call(this.xAxis);
	this.yAxisSvg = this.contents.append('div')
		.attr('class','axisWrapper')
		.style('width',this.margin.left+'px')
		.style('position','absolute')
		.style('top',this.margin.top+'px')
		.style('left',0)
		.style('bottom',this.margin.bottom+'px')
		.append('svg').append('g')
			.attr('class','axis')
			.attr('id','yAxis')
			.attr('transform','translate('+this.margin.left+',0)')
			.call(this.yAxis);

	//Determine screen DPI to rescale canvas contexts
	//(prevents artifacts and blurring on some displays)
	//https://stackoverflow.com/a/15666143/2827258
	this.pixelRatio = (function() {
		var ctx = document.createElement('canvas').getContext("2d"),
			dpr = window.devicePixelRatio || 1,
			bsr = ctx.webkitBackingStorePixelRatio ||
					ctx.mozBackingStorePixelRatio ||
					ctx.msBackingStorePixelRatio ||
					ctx.oBackingStorePixelRatio ||
					ctx.backingStorePixelRatio || 1;
			return dpr / bsr;
	})();

	//Create canvases
	this.canvasStack = this.contents.append('div')
		.attr('class', 'canvasStack')
		.style('position','absolute')
		.style('top', this.margin.top+'px')
		.style('right', this.margin.right+'px')
		.style('bottom', this.margin.bottom+'px')
		.style('left', this.margin.left+'px');
	
	//Canvas for "hidden" lines (greyed-out).
	this.hiddenCanvas = this.canvasStack.append('canvas')
		.attr('id', 'hiddenCanvas')
	this.hiddenCanvasContext = this.hiddenCanvas.node().getContext('2d');
	this.hiddenCanvasContext.globalAlpha = 0.5;

	//Canvas for shown lines (green).
	this.shownCanvas = this.canvasStack.append('canvas')
		.attr('id', 'shownCanvas');
	this.shownCanvasContext = this.shownCanvas.node().getContext('2d');
	this.shownCanvasContext.globalAlpha = 0.2;

	//Canvas for highlighted lines
	this.highlightCanvas = this.canvasStack.append('canvas')
		.attr('id', 'highlightCanvas');
	this.highlightCanvasContext = this.highlightCanvas.node().getContext('2d');
	this.highlightCanvasContext.lineWidth = 3;

	//The idCanvas is invisible and remains at 1000x1000 pixels.
	//It draws the data in a different color for each data point.
	//The pixel data of this canvas is then used to determine when
	//the mouse is over a data point on the regular canvases.
	this.idCanvas = this.canvasStack.append('canvas')
		.attr('id','idCanvas')
		.attr('width','1000px')
		.attr('height','1000px');
	this.idCanvasContext = this.idCanvas.node().getContext('2d');
	this.idCanvasContext.lineWidth = 4;

	//Placed over the canvas stack when in erase or include modes.
	//Prevents zooming and handles drag events.
	this.eraseIncludeMask = this.contents.append('div')
		.attr('class', 'eraseIncludeMask')
		.style('position','absolute')
		.style('top', this.margin.top+'px')
		.style('right', this.margin.right+'px')
		.style('bottom', this.margin.bottom+'px')
		.style('left', this.margin.left+'px')
		.style('display','none');

	//Data variables
	this.getData = getData;
	this.config = config;
	this.fullDsList = [];
	this.loadedData = {};
	this.extentX = [];
	this.extentY = [];
	this.selection = [];

	//Event handling
	this.dispatch = d3.dispatch('mouseover','click','erase','include');
	this.prevMouseOver = null;

	//Apply mouse listeners and zoom to canvas stack.
	this.canvasStack
		.on('mousemove', function() {
			self.mousemove(d3.event.offsetX,d3.event.offsetY,d3.event);
		})
		.on('click', function() {
			self.mouseclick(d3.event.offsetX,d3.event.offsetY,d3.event);
		})
		.call(self.zoomBehavior
			.extent([[0,0],[self.internalWidth,self.internalHeight]])
			.translateExtent([[0,0],[self.internalWidth,self.internalHeight]])
		);

	//Apply drag behavior to eraseIncludeMask
	this.eraseIncludeMask
		.call(this.eraseIncludeDrag.container(this.eraseIncludeMask.node()));


	//Animation and loading
	this.loadIndicator = this.canvasStack.append('div')
		.attr('class','loadIndicator')
		.style('display','none');
	this.loadIcon = this.loadIndicator.append('div')
		.attr('class','loadIcon')
	this.loadText = this.loadIndicator.append('div')
		.attr('class','loadText')
		.style('display','none');

	this.stillDrawing = false;//indicates that data is still being loaded in
	this.stillLoading = false;//indicates that the graph is still being redrawn

	this.loadingPrevious = false;//indicates that the previous load request has not finished yet

	//Iterators for loading and redrawing
	this.loadIter;
	this.drawShownIter;
	this.drawHiddenIter;
	this.drawIdIter;

	//Set tick-rate to ~60fps
	setInterval(this.tick, 16, this);
}

//Called every frame (roughly 60 times a second).
//If any iterators are active (defined), iterate through them.
//When an iterator is finished, set it to undefined.
LineChart.prototype.tick = function(self) {
	var doneDraw = false;//was any drawing done this frame?
	var doneLoad = false;//was any loading done this frame?

	//Load iterator
	if (self.loadIter) {
		if (!self.loadingPrevious) {
			if (self.loadIter.next().done)
				self.loadIter = undefined;
		}
		doneDraw = true;
		doneLoad = true;
	}

	//Shown and Hidden canvas redraw iterators
	//This is quick so it iterates up to 25 times each frame
	for (var i = 0; i < 25; i++) {
		if (self.drawShownIter) {
			if (self.drawShownIter.next().done) {
				self.drawShownIter = undefined;
			}
			doneDraw = true;
		}

		if (self.drawHiddenIter) {
			if (self.drawHiddenIter.next().done) {
				self.drawHiddenIter = undefined;
			}
			doneDraw = true;
		}
	}

	//Id canvas redraw iterator
	for (var i = 0; i < 10; i++) {
		if (self.drawIdIter) {
			if (self.drawIdIter.next().done) {
				self.drawIdIter = undefined;
			}
			doneDraw = true;
		}
	}

	//Set visibility of loading icon/text if any work was done this frame
	if (doneLoad != self.stillLoading) {
		self.loadText.style('display', doneLoad ? 'initial' : 'none');
		self.stillLoading = doneLoad;
	}
	if (doneDraw != self.stillDrawing) {
		self.loadIndicator.style('display', doneDraw ? 'initial' : 'none');
		self.stillDrawing = doneDraw;
	}
}

//Call this whenever the parent changes size.
//Rescales axes and redraws canvases
LineChart.prototype.updateSize = function() {
	this.parentRect = this.parent.node().getBoundingClientRect();
	this.internalWidth = this.parentRect.width - this.margin.left - this.margin.right;
	this.internalHeight = this.parentRect.height - this.margin.top - this.margin.bottom;

	var self = this;
	this.canvasStack.selectAll('canvas:not(#idCanvas)')
		.attr('width',this.internalWidth*this.pixelRatio)
		.attr('height',this.internalHeight*this.pixelRatio)
		.each(function() {
			var ctx = this.getContext('2d');
			ctx.scale(self.pixelRatio,self.pixelRatio);
		});
	this.shownCanvasContext.globalAlpha = 0.2;
	this.hiddenCanvasContext.globalAlpha = 0.5;
	this.highlightCanvasContext.lineWidth = 3;

	this.canvasStack.call(self.zoomBehavior
		.extent([[0,0],[self.internalWidth,self.internalHeight]])
		.translateExtent([[0,0],[self.internalWidth,self.internalHeight]])
	);

	this.x.range([0,this.internalWidth]);
	this.y.range([this.internalHeight,0]);
	this.currentX.range(this.x.range());
	this.currentY.range(this.y.range());

	this.xAxis.scale(this.currentX);
	this.yAxis.scale(this.currentY);

	this.contents.select('#xAxis')
		.call(this.xAxis);
	this.contents.select('#yAxis')
		.call(this.yAxis);

	this.redraw();
}

//Begin a redraw of the shown data and hidden data canvases.
//Clears both canvases, and sets an iterator that will gradually
//draw lines in when called by the tick function
LineChart.prototype.redraw = function() {
	var self = this;

	this.shownCanvasContext.clearRect(0,0,this.internalWidth,this.internalHeight);
	this.drawShownIter = (function*(queue){
		var i = 0;
		while (i < queue.length) {
			self.drawLines(self.shownCanvasContext,
							[queue[i]],
							BaseLineColor);
			yield ++i;
		}
	})(this.shownData);

	this.hiddenCanvasContext.clearRect(0,0,this.internalWidth,this.internalHeight);
	this.drawHiddenIter = (function*(queue){
		var i = 0;
		while (i < queue.length) {
			self.drawLines(self.hiddenCanvasContext,
							[queue[i]],
							BaseLineColor);
			yield ++i;
		}
	})(this.hiddenData);

	this.redrawSingleContext(this.highlightCanvasContext,this.highlightData);
}

//Redraw the given canvas context with the given data in the given color
//Note that this will redraw the context instantly, not through an iterator.
LineChart.prototype.redrawSingleContext = function(context, data, color) {
	context.clearRect(0,0,this.internalWidth,this.internalHeight);
	if (data.length > 0)
		this.drawLines(context, data, color);
}

//Begin a redraw of the Id canvas.
//Clears the canvas and sets an iterator that will gradually
//draw lines in when called by the tick function
LineChart.prototype.redrawIdContext = function() {
	var self = this;
	this.idCanvasContext.clearRect(0,0,1000,1000);
	this.drawIdIter = (function*(queue) {
		var i = 0;
		while (i < queue.length) {
			self.drawLines(self.idCanvasContext,
							[queue[i]],
							"id");
			yield ++i;
		}
	})(this.mode == 'include' ? this.hiddenData : this.shownData);
}

//Draws a line on the given context for the given data points in the given color.
//If color is unspecified, defaults to the color specified by the data point itself.
//If color is "id", draws in a color according to the data's index (used on the id canvas)
LineChart.prototype.drawLines = function(context, dsList, color) {
	for (var i in dsList) {
		var ds = dsList[i];
		if (color) {
			if (color == 'id') {
				var id = ds.id+1;
				var b = Math.floor(id/256/256);
				var g = Math.floor((id - b*256*256) / 256);
				var r = (id - b*256*256 - g*256);
				context.strokeStyle = 'rgb('+r+','+g+','+b+')';//color
			}
			else {
				context.strokeStyle = ds.dataSet.bgcolor ? ds.dataSet.bgcolor : color;
			}
		}
		else {
			context.strokeStyle = ds.dataSet.color;
		}
		context.beginPath();
		if (color == 'id') {
			for (var j = 0; j < ds.points.length; j++) {
				var d = ds.points[j];
				if (j == 0)
					context.moveTo(this.idCanvasX(d.x),this.idCanvasY(d.y));
				else
					context.lineTo(this.idCanvasX(d.x),this.idCanvasY(d.y));
			}
		}
		else {
			for (var j = 0; j < ds.points.length; j++) {
				var d = ds.points[j];
				if (j == 0)
					context.moveTo(this.currentX(d.x),this.currentY(d.y));
				else
					context.lineTo(this.currentX(d.x),this.currentY(d.y));
			}
		}
		context.stroke();
	}
}

//Filter the data to only include those with the indices specified in query
//Note that data not in the query is completely removed from the graph,
//and not merely greyed-out liked erased data
LineChart.prototype.setSelection = function(query) {
	var self = this;
	this.selection = query;
	this.shownData = [];
	this.hiddenData = [];

	query.forEach(function (item, index) {
		if (self.loadedData[item])
			self.shownData = self.shownData.concat(self.loadedData[item]);
	});

	this.redraw();
	this.redrawIdContext();
}

//Set the current mode of interacting with the chart to zoom, erase or include
//Zoom: Allows zooming, panning and highlighting of data
//Erase: Click and drag over data to fire erase events for it 
//	(It's up to a listener to actually call the erase method on it)
//Include: Click and drag over erased data to fire include events for it
//	(It's up to a listener to actually call the include method on it)
//	(Include mode causes mouse listening to only work for erased data)
LineChart.prototype.setMode = function(newMode) {
	switch (newMode) {
		case "zoom":
			this.mode = "zoom";
			this.eraseIncludeMask.style('display','none');
			break;
		case "erase":
			this.mode = "erase";
			this.eraseIncludeMask.style('display','initial');
			break;
		case "include":
			this.mode = "include";
			this.eraseIncludeMask.style('display','initial');
	}
	this.redrawIdContext();
}

//Erase the data with the given index. Moves it to the hidden canvas which greys it out
//Erased data cannot be moused over (unless in include mode)
LineChart.prototype.eraseData = function(index) {
	var self = this;
	if (self.loadedData[index]) {
		var i = this.shownData.findIndex(function(d){return d.id == self.loadedData[index][0].id;});
		if (i != -1) {
			this.shownData.splice(i,2);
			this.hiddenData = this.hiddenData.concat(this.loadedData[index]);
			this.redraw();
			this.redrawIdContext();
		}
	}
}

//Include the data with the given index. Moves it to the shown canvas
LineChart.prototype.includeData = function(index) {
	var self = this;
	var i = this.hiddenData.findIndex(function(d){return d.id == self.loadedData[index][0].id;});
	if (i != -1) {
		this.hiddenData.splice(i,2);
		this.shownData = this.shownData.concat(this.loadedData[index]);
		this.redraw();
		this.redrawIdContext();
	}
}

//Adds the data points with the specified indices to the highlight canvas
LineChart.prototype.setHighlight = function(indices) {
	this.highlightData = [];
	if (indices != null) {
		for (var i = 0; i < indices.length; i++) {
			if (this.loadedData[indices[i]]) {
				this.highlightData = this.highlightData.concat(this.loadedData[indices[i]]);
			}
		}
	}
	this.redrawSingleContext(this.highlightCanvasContext,this.highlightData);
}

//Respond to zoom events.
//Adjust domain on scales, and redraw accordingly
LineChart.prototype.zoom = function(transform) {
	var self = this;

	this.currentX.domain([this.x.invert(-transform.x/transform.k), this.x.invert(self.internalWidth/transform.k - transform.x/transform.k)]);
	this.currentY.domain([this.y.invert(self.internalHeight/transform.k - transform.y/transform.k),this.y.invert(-transform.y/transform.k)]);

	this.idCanvasX.domain(this.currentX.domain());
	this.idCanvasY.domain(this.currentY.domain());

	this.contents.select('#xAxis')
		.call(self.xAxis.scale(self.currentX));
	this.contents.select('#yAxis')
		.call(self.yAxis.scale(self.currentY));

	this.redraw();
	this.redrawIdContext();

	if (d3.event.sourceEvent)
		this.mousemove(d3.event.sourceEvent.offsetX,d3.event.sourceEvent.offsetY,d3.event);
}

//Respond to drag events
//If dragging over data, fire an erase or include event depending on the current mode
LineChart.prototype.drag = function(event) {
	var self = this;
	var index = this.findDataAtPoint(event.x,event.y);
	if (index != null) {
		if (this.mode == 'erase')
			this.dispatch.call('erase',this,index);
		else if (this.mode == 'include')
			this.dispatch.call('include',this,index);
	}
}

//Respond to mouse movement (when in zoom mode)
//Fire a mouseover event if mousing over a data point
//The event fires with null as the index if moving off a data point
//only fires if the data point changed from last time the event fired
LineChart.prototype.mousemove = function(xCoord, yCoord, event) {
	var self = this;
	var index = this.findDataAtPoint(xCoord,yCoord);
	if (index != this.prevMouseOver) {
		this.dispatch.call('mouseover',self,index,event);
		this.prevMouseOver = index;
	}
}

//Respond to mouse clicks (when in zoom mode)
//Fire a click event with the index of the moused over point.
//The event fires with null as the index if clicking over a blank space
LineChart.prototype.mouseclick = function(xCoord, yCoord, event) {
	var self = this;
	var index = this.findDataAtPoint(xCoord,yCoord);
	this.dispatch.call('click',self,index,event);
}

//Get the index of the data point drawn at the given coordinates on the canvas.
//Makes use of the idCanvas color information to find the id at that point
LineChart.prototype.findDataAtPoint = function(xCoord,yCoord) {
	var x = this.idCanvasX(this.currentX.invert(xCoord));
	var y = this.idCanvasY(this.currentY.invert(yCoord));
	var imageData = this.idCanvasContext.getImageData(x-1,y-1,3,3).data;
	var vals = [];
	for (var f = 0; f < imageData.length/4; f++) {
		vals.push(imageData[f*4] + imageData[f*4+1]*256 + imageData[f*4+2]*256*256);
	}
	vals.sort();

	var val = -1;
	var freq = 0;
	for (var f = 0; f < vals.length; f++) {
		if (freq == 4)
			break;
		if (val != vals[f]) {
			val = vals[f];
			freq = 0;
		}
		freq = freq + 1;
	}

	var data = this.mode == 'include' ? this.hiddenData : this.shownData;
	var foundIndex = -1;
	var found = false;
	for (var f = 0; f < data.length; f++) {
		if (data[f].id == (val-1)) {
			foundIndex = f;
			found = true;
			break;
		}
	}

	if (found && freq >= 4 && val > 0)
		return val-1;
	else
		return null;
}

//Convenience methods used when loading data
function escapeRegExp(str) {
	return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}
function replaceAll(str, find, replace) {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

// Loads the data represented by the indices given in query.
// Sets an iterator which will gradually load data in when
// called by the tick function
LineChart.prototype.loadData = function(query) {
	var self = this;

	this.setSelection(query);

	this.loadIter = (function*(queue) {
		var i = 0;
		while (i < queue.length) {
			self.loadingPrevious = true;
			self.loadSingleData(queue[i], function() {
				self.loadingPrevious = false;
			});
			self.loadText.text('Loading: ' + (i+1) + "/" + queue.length);
			yield ++i;
		}
	})(query);
}

// Loads in the data for a given index.
// Note that each index can potentially return multiple data points,
// in which case all will be loaded in.
// Calls callback when done (with a boolean value indicating if the load was successful).
LineChart.prototype.loadSingleData = function(index, callback) {
	var self = this;
	var id = index;
	var dsList = [];

	//Call getData to get an array of data sets for the given index.
	// Each data set should have the following fields:
	// {file, color, columnX, columnY}
	// file: Path to the file containing data
	// color: A specific color to draw this data in (on highlight canvas)
	// columnX: Specify which column of data in the file to use for the x-axis of the line
	//	(Set to -1 to use the row number)
	// columnY: Specify which column of data in the file to use for the y-axis of the line
	//	(Set to -1 to just use first two columns for x and y, respectively)
	// delimiter: Specifiy the character used to deliminate data in the file
	var d = this.getData(index, this.config);

	if (d == null) {
		callback(false);
		return null;
	}

	d.forEach(function(dataSet, dataSetIndex) {
		d3.text(dataSet.file, function(text) {
			if (text) {
				// If text is white-space delimited, convert to tab-delimited
				if (dataSet.delimiter == " ") {
					var lines = text.split('\n');
					text = '';
					lines = lines.slice(2, lines.length);
					lines.forEach(function(item, index) {
						if (index == 0) {
							text = lines[index].trim();
						}
						else {
							if (index % 10 == 0) {
								text = text + "\n" + lines[index].trim();
							}
						}
					});
					text = replaceAll(text,"  ","\t");
				}

				// If text is other delimited, convert to tab-delimited
				if (dataSet.delimiter) {
					var lines = text.split('\n');
					text = '';
					lines = lines.slice(2, lines.length);
					lines.forEach(function(item, index) {
						if (index == 0) {
							text = lines[index].trim();
						}
						else {
							if (index % 10 == 0) {
								text = text + "\n" + lines[index].trim();
							}
						}
					});
					text = replaceAll(text,dataSet.delimiter,"\t");
				}

				//Parse into rows
				var rows = d3.tsvParseRows(text).map(function(row) {
					return row.map(function(value) {
						return +value;
					});
				});
				//Parse rows into points
				var points = []
				if (dataSet.columnY >= 0) {
					rows.forEach(function(row, index) {
						var xval = index;
						if (dataSet.columnX != null && dataSet.columnX >= 0) {
							xval = row[dataSet.columnX];
						}
						points.push({x : xval, y : row[dataSet.columnY]});
					});
				}
				else {
					rows.forEach(function(row, index) {
						points.push({x : row[0], y : row[1]});
					});
				}

				dsList.push({dataSet: dataSet, points: points, id: id});
				self.fullDsList.push({dataSet: dataSet, points: points, id: id});

				//Calculate new extents of the data
				var oldExtentX = self.extentX.slice(),
					oldExtentY = self.extentY.slice();
				var dataExtentX = d3.extent(points, function(d) { return d.x; }),
					dataExtentY = d3.extent(points, function(d) { return d.y; });
				self.extentX = d3.extent(self.extentX.concat(dataExtentX));
				self.extentY = d3.extent(self.extentY.concat(dataExtentY));
				
				var extentsChanged = (self.extentX[0] != oldExtentX[0] ||
						self.extentX[1] != oldExtentX[1] ||
						self.extentY[0] != oldExtentY[0] ||
						self.extentY[1] != oldExtentY[1]);
				//Set new domains on scales if extents have changed
				if (extentsChanged) {
					self.x.domain(d3.extent(self.extentX, function(d) { return d; }));
					self.y.domain(d3.extent(self.extentY, function(d) { return d; }));
					self.currentX.domain(self.x.domain().slice());
					self.currentY.domain(self.y.domain().slice());
					self.idCanvasX.domain(self.x.domain().slice());
					self.idCanvasY.domain(self.y.domain().slice());
					self.updateSize();
					self.redrawIdContext();
				}

				//Once all data for this index has been loaded,
				//Add to loaded data and draw on canvas if they are included
				//in the current selection
				if (dataSetIndex == d.length - 1) {
					self.loadedData[id] = dsList;
					if (self.selection.includes(id)) {
						self.shownData = self.shownData.concat(dsList);
						self.drawLines(self.shownCanvasContext,dsList,"black");
						if (self.mode != 'include')
							self.drawLines(self.idCanvasContext,dsList,"id");
					}
					callback(true);
				}
			}//end if (text)
			else {
				callback(false);
			}
		});
	});
}
