'use strict';

function LineChart(parent, getData) {

	this.parent = parent;
	this.margin = {top: 30, right: 10, bottom: 20, left: 60};
	this.parentRect = parent.node().getBoundingClientRect();
	this.internalWidth = this.parentRect.width - this.margin.left - this.margin.right;
	this.internalHeight = this.parentRect.height - this.margin.top - this.margin.bottom;

	this.shownData = [];
	this.hiddenData = [];
	this.highlightData = [];

	this.mode = "zoom";

	this.x = d3.scaleLinear().range([0,this.internalWidth]);
	this.y = d3.scaleLinear().range([this.internalHeight,0]);
	this.currentX = d3.scaleLinear().range(this.x.range());
	this.currentY = d3.scaleLinear().range(this.y.range());
	this.idCanvasX = d3.scaleLinear().range([0,1000]);
	this.idCanvasY = d3.scaleLinear().range([1000,0]);

	this.xAxis = d3.axisBottom(this.x);
	this.yAxis = d3.axisLeft(this.y);

	var self = this;
	this.zoomBehavior = d3.zoom()
		.scaleExtent([1,20])
		.on('zoom',function() {
			//console.log(d3.event.transform.x + " " + d3.event.transform.y);
			self.zoom(d3.event.transform);
		});
	
	this.eraseIncludeDrag = d3.drag()
		.on('drag', function() {
			//console.log("dragging: " + d3.event.x + " " + d3.event.y);
			self.drag(d3.event);
		})

	this.contents = parent.append('div')
		.attr('class','lineChart');

	/*this.axes = this.contents.append('svg')
		.attr('id','axes');*/
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

	this.canvasStack = this.contents.append('div')
		.attr('class', 'canvasStack')
		.style('position','absolute')
		.style('top', this.margin.top+'px')
		.style('right', this.margin.right+'px')
		.style('bottom', this.margin.bottom+'px')
		.style('left', this.margin.left+'px');

	this.hiddenCanvas = this.canvasStack.append('canvas')
		.attr('id', 'hiddenCanvas')
	this.hiddenCanvasContext = this.hiddenCanvas.node().getContext('2d');
	this.hiddenCanvasContext.globalAlpha = 0.5;

	this.shownCanvas = this.canvasStack.append('canvas')
		.attr('id', 'shownCanvas');
	this.shownCanvasContext = this.shownCanvas.node().getContext('2d');
	this.shownCanvasContext.globalAlpha = 0.2;

	this.highlightCanvas = this.canvasStack.append('canvas')
		.attr('id', 'highlightCanvas');
	this.highlightCanvasContext = this.highlightCanvas.node().getContext('2d');
	this.highlightCanvasContext.lineWidth = 3;

	this.idCanvas = this.canvasStack.append('canvas')
		.attr('id','idCanvas')
		.attr('width','1000px')
		.attr('height','1000px');
	this.idCanvasContext = this.idCanvas.node().getContext('2d');
	this.idCanvasContext.lineWidth = 4;

	this.eraseIncludeMask = this.contents.append('div')
		.attr('class', 'eraseIncludeMask')
		.style('position','absolute')
		.style('top', this.margin.top+'px')
		.style('right', this.margin.right+'px')
		.style('bottom', this.margin.bottom+'px')
		.style('left', this.margin.left+'px')
		.style('display','none');

	this.getData = getData;
	this.fullDsList = [];
	this.loadedData = {};
	this.drawMode = 0;
	this.dataLoaded = false;

	this.dispatch = d3.dispatch('mouseover','erase','include');
	this.prevMouseOver = null;

	this.canvasStack
		.on('mousemove', function() {
			self.mousemove(d3.event.offsetX,d3.event.offsetY,d3.event);
		})
		.call(self.zoomBehavior
			.extent([[0,0],[self.internalWidth,self.internalHeight]])
			.translateExtent([[0,0],[self.internalWidth,self.internalHeight]])
		);

	this.eraseIncludeMask
		.call(this.eraseIncludeDrag.container(this.eraseIncludeMask.node()));
}

function escapeRegExp(str) {
	return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

// Load data (this should probably be moved out into its own javascript file for simplicity and flexibility
// of the LineChart code)
LineChart.prototype.loadData = function(query, callback) {
	var self = this;
	var dataSetsProcessed = 0;
	this.extentX = [];
	this.extentY = [];

	query.forEach(function(item, index) {
		var d = self.getData(item);
		var id = item;
		var dsList = [];

		d.forEach(function(dataSet, dataSetIndex) {
			d3.text(dataSet.file, function(text) {
				if (text) {
					// correct for white space delemited
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

					var rows = d3.tsvParseRows(text).map(function(row) {
						return row.map(function(value) {
							return +value;
						});
					});
					var rows2 = []
					if (dataSet.columnY >= 0) {	
						rows.forEach(function(item, index) {
							if (index % 1 == 0) {
								var xval = index;
								if (dataSet.columnX >= 0) {
									xval = item[dataSet.columnX];
								}
								rows2.push({x : xval, y : item[dataSet.columnY]});
							}
						});
					}
					else {
						rows.forEach(function(item, index) {
							if (index % 1 == 0) {
								rows2.push({x : item[0], y : item[1]});
							}
						});
					}

					dsList.push({dataSet: dataSet, rows: rows2, id: id});
					self.fullDsList.push({dataSet: dataSet, rows: rows2, id: id});

					self.extentX.push.apply(self.extentX, d3.extent(rows2, function(d) { return d.x; }));
					self.extentY.push.apply(self.extentY, d3.extent(rows2, function(d) { return d.y; }));

					if (dataSetIndex == d.length - 1) {
						self.loadedData[id] = dsList;
					}
				}

				if (dataSetIndex == d.length - 1) {
					dataSetsProcessed = dataSetsProcessed + 1;
				}

				if (dataSetsProcessed == query.length) {
					self.x.domain(d3.extent(self.extentX, function(d) { return d; }));
					self.y.domain(d3.extent(self.extentY, function(d) { return d; }));
					self.currentX.domain(self.x.domain().slice());
					self.currentY.domain(self.y.domain().slice());
					self.idCanvasX.domain(d3.extent(self.extentX, function(d) { return d; }));
					self.idCanvasY.domain(d3.extent(self.extentY, function(d) { return d; }));

					//self.drawLines(self.hiddenCanvasContext, self.fullDsList, "lightgrey");
					self.drawLines(self.idCanvasContext, self.fullDsList, "id");
					//self.drawLines(self.shownCanvasContext, self.fullDsList, "green");
					self.shownData = self.fullDsList;
					//self.xAxis();
					//self.yAxis();
					self.dataLoaded = true;
					callback();
				}
			});
		});
	});
	
}

LineChart.prototype.updateSize = function() {
	this.parentRect = this.parent.node().getBoundingClientRect();
	this.internalWidth = this.parentRect.width - this.margin.left - this.margin.right;
	this.internalHeight = this.parentRect.height - this.margin.top - this.margin.bottom;

	var self = this;
	this.canvasStack.selectAll('canvas:not(#idCanvas)')
		.attr('width',this.internalWidth)
		.attr('height',this.internalHeight);
	this.shownCanvasContext.globalAlpha = 0.2;
	//this.shownCanvasContext.globalCompositeOperation = "difference";
	this.hiddenCanvasContext.globalAlpha = 0.5;
	//this.hiddenCanvasContext.globalCompositeOperation = "difference";
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

LineChart.prototype.redraw = function() {
	/*this.hiddenCanvasContext.clearRect(0,0,this.internalWidth,this.internalHeight);
	this.shownCanvasContext.clearRect(0,0,this.internalWidth,this.internalHeight);
	this.highlightCanvasContext.clearRect(0,0,this.internalWidth,this.internalHeight);

	if (this.hiddenData.length > 0) {
		this.drawLines(this.hiddenCanvasContext, this.hiddenData, "lightgrey");
	}
	if (this.shownData.length > 0) {
		this.drawLines(this.shownCanvasContext, this.shownData, "green");
	}
	if (this.highlightData.length > 0) {	
		this.drawLines(this.highlightCanvasContext,this.highlightData);
	}*/
	this.redrawSingleContext(this.shownCanvasContext,this.shownData,"green");
	this.redrawSingleContext(this.hiddenCanvasContext,this.hiddenData,"lightgrey");
	this.redrawSingleContext(this.highlightCanvasContext,this.highlightData);
}

LineChart.prototype.redrawSingleContext = function(context, data, color) {
	context.clearRect(0,0,this.internalWidth,this.internalHeight);
	if (data.length > 0)
		this.drawLines(context, data, color);
}

LineChart.prototype.redrawIdContext = function() {
	var self = this;
	setTimeout(function() {
		if (new Date() - self.timeLastCalled >= 500) {
			self.idCanvasContext.clearRect(0, 0, 1000,1000);
			self.drawLines(self.idCanvasContext, self.mode == 'include' ? self.hiddenData : self.shownData, 'id');
		}
	},500);
	this.timeLastCalled = new Date();
}

// This function draws lines for the data sets on the selected context (can specify a color)
LineChart.prototype.drawLines = function(context, dsList, color) {
	var self = this;
	dsList.forEach(function(item, index) {
		if (color) {
			if (color == 'id') {
				var id = (item.id + 1);
				var b = Math.floor(id / 256 / 256);
				var g = Math.floor((id - b*256*256) / 256);
				var r = (id - b*256*256 - g*256);
				context.strokeStyle = 'rgb('+r+','+g+','+b+')';//color;
			}
			else {
				context.strokeStyle = color;
			}
		}
		else {
			context.strokeStyle = item.dataSet.color;
		}
		context.beginPath();
		item.rows.forEach(function(item, index) {
			if (color == 'id') {
				if (index == 0) {
					context.moveTo(self.idCanvasX(item.x), self.idCanvasY(item.y));
				}
				else {
					context.lineTo(self.idCanvasX(item.x), self.idCanvasY(item.y));
				}
			}
			else {
				if (index == 0) {
					context.moveTo(self.currentX(item.x), self.currentY(item.y));
				}
				else {
					context.lineTo(self.currentX(item.x), self.currentY(item.y));
				}
			}
		});
		context.stroke();
	});
}

LineChart.prototype.setSelection = function(query) {
	var self = this;
	this.shownData = [];
	this.hiddenData = [];

	query.forEach(function (item, index) {
		if (self.loadedData[item])
			self.shownData = self.shownData.concat(self.loadedData[item]);
	});

	this.redraw();
	this.redrawIdContext();
}

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

LineChart.prototype.eraseData = function(index) {
	var self = this;
	var i = this.shownData.findIndex(function(d){return d.id == self.loadedData[index][0].id;});
	if (i != -1) {
		this.shownData.splice(i,2);
		this.hiddenData = this.hiddenData.concat(this.loadedData[index]);
		this.redraw();
		this.redrawIdContext();
	}
}

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

LineChart.prototype.drag = function(event) {
	var self = this;
	var index = this.findDataAtPoint(event.x,event.y);
	if (index != null) {
		if (this.mode == 'erase')
			//this.eraseData(index);
			this.dispatch.call('erase',this,index);
		else if (this.mode == 'include')
			//this.includeData(index);
			this.dispatch.call('include',this,index);
	}
}

LineChart.prototype.mousemove = function(xCoord, yCoord, event) {
	var index = this.findDataAtPoint(xCoord,yCoord);
	if (index != this.prevMouseOver) {
		this.dispatch.call('mouseover',self,index,event);
		this.prevMouseOver = index;
	}
}

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