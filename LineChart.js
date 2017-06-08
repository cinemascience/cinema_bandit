'use strict';

var numLineCharts = 0;

function LineChart(parent, getData, onLineHover) {
	var self = this;
	this.parent = parent;
	this.chartId = numLineCharts;
	numLineCharts = numLineCharts + 1;
	this.onLineHover = onLineHover;
    this.highlighted = [];
    this.dragInfo = {};
    this.queue = d3.queue();
	this.parent.attr("style", "position:relative;left:0px;top:0px;");
	//	.attr('width','100%')
	//	.attr('height','100%');
	this.parentRect = parent.node().getBoundingClientRect();
	console.log('' + this.parentRect.width + ',' + this.parentRect.height)
	var canvas = parent.append("canvas")
		.attr('width', this.parentRect.width)
		.attr('height', this.parentRect.height)
		.attr('preserveAspectRatio','none')
		.attr("style", "z-index: 1;position:relative;left:0px;top:0px;");
	this.canvasList = [canvas];
	this.canvasRect = canvas.node().getBoundingClientRect();
	this.canvasX = d3.transform(parent.attr("transform")).translate[0];
	this.canvasY = d3.transform(parent.attr("transform")).translate[1];
	this.margin = {top: 30, right: 10, bottom: 20, left: 100};
	this.internalWidth = this.canvasRect.width - this.margin.left - this.margin.right;
	this.internalHeight = this.canvasRect.height - this.margin.top - this.margin.bottom;
	this.level0 = canvas.node().getContext("2d");
	this.level0.fillStyle = "white";//"#9ea7b8";
	this.level0.translate(this.margin.left, this.margin.top);
    this.level0.fillRect(0,0,this.internalWidth,this.internalHeight);
    canvas = parent.append("canvas")
		.attr("width", this.canvasRect.width*2)
		.attr("height", this.canvasRect.height*2)
		.attr("style", "z-index: 2;position:absolute;left:0px;top:0px;visibility: hidden;");
		//.attr("style", "z-index: 2;position:absolute;left:0px;top:0px");
	this.canvasList.push(canvas);
	this.idCanvas = canvas;
	this.idContext = canvas.node().getContext("2d");
	this.idContext.fillStyle = "white";
	this.idContext.translate(this.margin.left*2, this.margin.top*2);
	this.idContext.lineWidth=3;
    this.idContext.clearRect(0, 0, this.internalWidth*2,this.internalHeight*2);
	canvas = parent.append("canvas")
		.attr("width", this.canvasRect.width)
		.attr("height", this.canvasRect.height)
		.attr("style", "z-index: 2;position:absolute;left:0px;top:0px;");
	this.canvasList.push(canvas);
	this.level1 = canvas.node().getContext("2d");
	this.level1.fillStyle = "white";
	this.level1.globalAlpha = 0.125;
	this.level1.globalCompositeOperation = "difference";
	this.level1.translate(this.margin.left, this.margin.top);
    this.level1.clearRect(0, 0, this.internalWidth,this.internalHeight);
	canvas = parent.append("canvas")
		.attr("width", this.canvasRect.width)
		.attr("height", this.canvasRect.height)
		.attr("style", "z-index: 3;position:absolute;left:0px;top:0px;");
	this.canvasList.push(canvas);
	this.level2 = canvas.node().getContext("2d");
	this.level2.fillStyle = "white";
	this.level2.lineWidth=1;
	this.level2.imageSmoothingEnabled= false;
	this.level2.globalAlpha = 0.4;
	this.level2.globalCompositeOperation = "difference";
	this.level2.translate(this.margin.left, this.margin.top);
    this.level2.clearRect(0, 0, this.internalWidth,this.internalHeight);
    canvas = parent.append("canvas")
		.attr("width", this.canvasRect.width)
		.attr("height", this.canvasRect.height)
		.attr("style", "z-index: 4;position:absolute;left:0px;top:0px;cursor: ");
	this.canvasLevel3 = canvas;
	this.canvasList.push(canvas);
	this.level3 = canvas.node().getContext("2d");
	self.version2 = 0;
	d3.select(canvas.node()).on("mousemove", function() {
		if (self.dragInfo.dragging && self.mode == "Zoom") {
			//console.log('' + self.margin.left + ',' + self.margin.top, + ',' + self.internalWidth + ',' + self.internalHeight);
			//self.level3.clearRect(0, 0, self.internalWidth,self.internalHeight);
			self.level3.clearRect(-self.margin.left, -self.margin.top, self.parentRect.width, self.parentRect.height);
			self.level3.beginPath();
			self.level3.rect(self.dragInfo.startX, self.dragInfo.startY, d3.event.offsetX-self.margin.left-self.dragInfo.startX, d3.event.offsetY-self.margin.top-self.dragInfo.startY);
			self.level3.stroke(); 
			self.level3.closePath();
			//
			return;
		}

    	//console.log('' + d3.event.offsetX + ',' + d3.event.offsetY);
    	var imageData = self.idContext.getImageData(d3.event.offsetX*2-1, d3.event.offsetY*2-1, 3, 3).data;
    	//console.log(imageData);
    	var vals = []
    	for (var f = 0; f < imageData.length/4; f++) {
    		vals.push(imageData[f*4] + imageData[f*4 + 1]*256 + imageData[f*4 + 2]*256*256);
    	}
    	vals.sort();
    	//console.log(vals);

    	var val = -1;
    	var freq = 0;
    	for (var f = 0; f < vals.length; f++) {
    		if (freq == 4) {
    			break;
    		}

    		if (val != vals[f]) {
    			val = vals[f];
    			freq = 0;
    		}

    		freq = freq + 1;
    	}

    	var foundIndex = -1;
    	var found = false;
    	for (var f = 0; f < self.highlighted.length; f++) {
    		if (self.highlighted[f].id == (val-1)) {
    			foundIndex = f;
    			found = true;
    			break;
    		}
    	}

    	if (self.mode == "Erase") {
    		if (self.dragInfo.dragging) {
    			if (found && freq >= 4 && val > 0) {

					for (var f = foundIndex; f < self.highlighted.length; f++) {
					    if (self.highlighted[f].id == (val-1)) {
							self.highlighted.splice(f,1);
							f--;
					    }
					}
			    	

			    	//self.redraw();
		    		self.redrawContext(self.level2, 1, self.highlighted, 'green');
		    		self.version2 = self.version2 + 1;
		    		var dsList = self.highlighted;

					var q = d3.queue();
					q.defer(function(callback) {
						var ver = self.version2;
						setTimeout(function() {
							if (ver == self.version2) {
								self.idContext.clearRect(0, 0, self.internalWidth*2,self.internalHeight*2);
								self.drawLines(self.idContext, dsList, 'id');
								//console.log("cleared");		
							}
							callback(null); 
						}, 200);
						q.await(function(error) {
							if (error) throw error;
							//console.log("Goodbye!"); 
						});
								
					});
	    		}

	    		
    		}


    		/*self.level3.clearRect(-self.margin.left, -self.margin.top, self.parentRect.width, self.parentRect.height);
			self.level3.beginPath();
			self.level3.arc(d3.event.offsetX-self.margin.left,d3.event.offsetY-self.margin.top,5,0,2*Math.PI);
			self.level3.stroke();
			self.level3.closePath();*/

    		return;
    	}

    	if (self.mode == "Include") {
    		if (self.dragInfo.dragging) {
    			if (freq >= 4 && val > 0) {

					self.highlighted.push.apply(self.highlighted, self.loadedData[val-1]);

			    	//self.redraw();
		    		self.redrawContext(self.level2, 1, self.highlighted, 'green');
		    		self.version2 = self.version2 + 1;
		    		var dsList = self.highlighted;

					var q = d3.queue();
					q.defer(function(callback) {
						var ver = self.version2;
						setTimeout(function() {
							if (ver == self.version2) {
								self.idContext.clearRect(0, 0, self.internalWidth*2,self.internalHeight*2);
								self.drawLines(self.idContext, self.fullDsList, 'id');
								//console.log("cleared");		
							}
							callback(null); 
						}, 200);
						q.await(function(error) {
							if (error) throw error;
							//console.log("Goodbye!"); 
						});
								
					});
	    		}

	    		
    		}


    		/*self.level3.clearRect(-self.margin.left, -self.margin.top, self.parentRect.width, self.parentRect.height);
			self.level3.beginPath();
			self.level3.arc(d3.event.offsetX-self.margin.left,d3.event.offsetY-self.margin.top,5,0,2*Math.PI);
			self.level3.stroke();
			self.level3.closePath();*/

    		return;
    	}


    	//console.log('' + val);
    	if (found && freq >= 4 && val > 0) {
    		//console.log('select' + (val-1));
    		//self.selectData([val-1]);
    		self.onLineHover(val-1, d3.event);
    	}
    	else {
    		self.onLineHover(null, d3.event);
    		//self.selectData([]);
    	}
      });
	d3.select(canvas.node()).on("mousedown", function() {
		self.dragInfo.startX = d3.event.offsetX-self.margin.left;
		self.dragInfo.startY = d3.event.offsetY-self.margin.top;
		self.dragInfo.dragging = true;
	});
	d3.select(canvas.node()).on("mouseup", function() {
		self.dragInfo.dragging = false;
		if (self.mode == "Zoom") {	
			console.log('' + self.dragInfo.startX + '-' + d3.event.offsetX + ',' + self.dragInfo.startY + '-' +  + d3.event.offsetY);
			self.dragInfo.endX = d3.event.offsetX-self.margin.left;
			self.dragInfo.endY = d3.event.offsetY-self.margin.top;
			self.resetButton.style("visibility", "visible");
			self.zoom();
		}
	});


	this.level3.fillStyle = "white";
	this.level3.translate(this.margin.left, this.margin.top);
    this.level3.clearRect(0, 0, this.internalWidth,this.internalHeight);
    this.level3.lineWidth=3;
    this.getData = getData;
    this.x = d3.scale.linear().range([0, this.internalWidth]);
    this.y = d3.scale.linear().range([this.internalHeight, 0]);
    this.x2 = d3.scale.linear().range([0, this.internalWidth*2]);
    this.y2 = d3.scale.linear().range([this.internalHeight*2, 0]);
    this.fullDsList = [];
    this.loadedData = {};
    // all = 0; highlighted = 1;
    this.drawMode = 0;
    this.version = 0;
    this.dataLoaded = false;

    this.extentX = [];
    this.extentY = [];

	this.cpDiv = parent.append("div")
		.attr("style", "z-index: 10;position:absolute;left:0px;top:0px;");
    this.resetButton = this.cpDiv.append("input")
		.attr('type', "button")
		.attr('value', "Reset")
		.attr("style", "z-index: 10;position:relative;left:0px;top:0px; visibility: hidden;");

    /*this.eraseButton = this.cpDiv.append("input")
		.attr('type', "button")
		.attr('value', "Erase")
		.attr("style", "z-index: 10;position:relative;left:0px;top:0px;");*/

	var modeData = ["Normal", "Zoom", "Erase", "Include"];
	modeData.forEach(function(item, index) {
		self.cpDiv.append("input")
			.attr({
        		type: "radio",
        		class: "shape",
        		name: "mode" + self.chartId,
        		value: item
        	})
        	.property("checked", index == 0);;
		self.cpDiv.append("label").text(function (d) { return item + " "; });
	});

	this.mode = "Normal";

	d3.selectAll("input[name=mode" + self.chartId + "]")
		.on("change", function() {

			if (self.mode == "Include") {
				var q = d3.queue();
				q.defer(function(callback) {
					setTimeout(function() {
							self.idContext.clearRect(0, 0, self.internalWidth*2,self.internalHeight*2);
							self.drawLines(self.idContext, self.highlighted, 'id');
						callback(null); 
					}, 200);
					q.await(function(error) {
						if (error) throw error;
						//console.log("Goodbye!"); 
					});
							
				});
			}

			self.mode = d3.select("input[name=mode" + self.chartId + "]:checked").attr("value");

			if (self.mode == "Normal") {
				self.canvasLevel3.style("cursor", "default");
			}
			else if (self.mode == "Zoom") {
				self.canvasLevel3.style("cursor", "zoom-in");
			}
			else if (self.mode == "Include") {
				self.canvasLevel3.style("cursor", "crosshair");
				var q = d3.queue();
				q.defer(function(callback) {
					setTimeout(function() {
							self.idContext.clearRect(0, 0, self.internalWidth*2,self.internalHeight*2);
							self.drawLines(self.idContext, self.fullDsList, 'id');
						callback(null); 
					}, 200);
					q.await(function(error) {
						if (error) throw error;
						//console.log("Goodbye!"); 
					});
							
				});
			}
			else {
				self.canvasLevel3.style("cursor", "crosshair");
			}
		});


	/*this.eraseInfo = {erasing: false};

	d3.select(this.eraseButton.node()).on("click", function() {
		self.eraseInfo.erasing = !self.eraseInfo.erasing;
		if (self.eraseInfo.erasing) {
			self.eraseButton.node().value = "Normal";
			self.canvasLevel3.style("cursor", "crosshair");
		}
		else {
			self.eraseButton.node().value = "Erase";
			self.canvasLevel3.style("cursor", "default");
		}
	});*/

	d3.select(this.resetButton.node()).on("click", function() {
		self.resetButton.style("visibility", "hidden");
		self.reset();
	});
}

function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

LineChart.prototype.loadData = function(query) {
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
	    			// /*  correct for white space delemited
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
		    				//lines[index] = lines[index].trim();
		    			});
		    			//text = lines.join('\n');//.replace(" ","\t");
		    			text = replaceAll(text,"  ","\t");
	    			}
	    			

	    			//console.log(text);
	    			//	*/

	    			var rows = d3.tsv.parseRows(text).map(function(row) {
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
				    self.x2.domain(d3.extent(self.extentX, function(d) { return d; }));
					self.y2.domain(d3.extent(self.extentY, function(d) { return d; }));

					self.drawLines(self.level1, self.fullDsList, "lightgrey");
					self.drawLines(self.idContext, self.fullDsList, "id");
					self.drawLines(self.level2, self.fullDsList, "green");
					self.highlighted = self.fullDsList;
					self.xAxis();
					self.yAxis();
					self.dataLoaded = true;
				}
	            

			});
	    });
	});
}

LineChart.prototype.setDrawMode = function(drawMode) {
	this.drawMode = drawMode;
	this.level1.clearRect(0,0,this.internalWidth,this.internalHeight);
	this.level2.clearRect(0, 0, this.internalWidth,this.internalHeight);
	this.level3.clearRect(0, 0, this.internalWidth,this.internalHeight);
	if (drawMode == 0) {
		self.drawLines(self.level1, fullDsList, "lightgrey");
	}
	self.drawLines(self.level2, highlighted, "lightgreen");
}

LineChart.prototype.drawLines = function(context, dsList, color) {
	var self = this;
	dsList.forEach(function(item, index) {
		if (color) {
			if (color == 'id') {
				var id = (item.id + 1);
				var b = Math.floor(id / 256 / 256);
				var g = Math.floor((id - b*256*256) / 256);
				var r = (id - b*256*256 - g*256);
				//context.strokeStyle = 'rgb('+r+',' + g + ',' + b + ')';//color;
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
					context.moveTo(self.x2(item.x), self.y2(item.y));
		    	}
		    	else {
					context.lineTo(self.x2(item.x), self.y2(item.y));	
				}
	   		}
	   		else {
		    	if (index == 0) {
					context.moveTo(self.x(item.x), self.y(item.y));
		    	}
		    	else {
					context.lineTo(self.x(item.x), self.y(item.y));
		    	}
	   		}
	    });
		context.stroke();
	});
}

LineChart.prototype.highlightData = function(query, color) {
	var self = this;

	if (!self.dataLoaded) {
		return;
	}

	//self.level1.fillRect(0,0,self.internalWidth,self.internalHeight);
	//self.level2.fillRect(0,0,self.internalWidth,self.internalHeight);
	self.level2.clearRect(0, 0, this.internalWidth,this.internalHeight);
	//this.drawLines(self.level1, self.fullDsList, fallbackColor);

	var dsList = [];
	query.forEach(function(item, index) {
		dsList.push.apply(dsList, self.loadedData[item]);
	});

	self.drawLines(self.level2, dsList, color);

		//self.idContext.clearRect(0, 0, this.internalWidth*2,this.internalHeight*2);

	self.version = self.version + 1;

		var q = d3.queue();
		q.defer(function(callback) {
			var ver = self.version;
			setTimeout(function() {
				if (ver == self.version) {
					//console.log('' + ver + ': ' + self.version);
					self.idContext.clearRect(0, 0, self.internalWidth*2,self.internalHeight*2);
					self.drawLines(self.idContext, dsList, 'id');
					//console.log("cleared");		
				}
				callback(null); 
			}, 200);
			q.await(function(error) {
				if (error) throw error;
				//console.log("Goodbye!"); 
			});
					
		});
	/*var q = d3.queue();
	q.defer(function(callback) {
			self.idContext.clearRect(0, 0, this.internalWidth*2,this.internalHeight*2);
			self.drawLines(self.idContext, dsList, 'id');
			console.log("cleared");
			callback(null); 
			q.await(function(error) {
				if (error) throw error;
				console.log("Goodbye!"); 
			});
	});*/
	//this.drawLines(self.idContext, dsList, 'id');
	this.highlighted = dsList;
}

LineChart.prototype.selectData = function(query) {
	var self = this;

	self.level3.clearRect(-self.margin.left, -self.margin.top, self.parentRect.width, self.parentRect.height);

	var dsList = [];
	query.forEach(function(item, index) {
		dsList.push.apply(dsList, self.loadedData[item]);
	});

	this.drawLines(self.level3, dsList);
}

LineChart.prototype.xAxis = function() {
	var self = this;
	  var tickCount = 10,
	      tickSize = 6,
	      ticks = self.x.ticks(tickCount),
	      tickFormat = self.x.tickFormat();

	  self.level0.beginPath();
	  ticks.forEach(function(d) {
	    self.level0.moveTo(self.x(d), self.internalHeight);
	    self.level0.lineTo(self.x(d), self.internalHeight + tickSize);
	  });
	  self.level0.strokeStyle = "black";
	  self.level0.stroke();

	  self.level0.textAlign = "center";
	  self.level0.textBaseline = "top";
	  ticks.forEach(function(d) {
	    self.level0.fillText(tickFormat(d), self.x(d), self.internalHeight + tickSize);
	  });
}

LineChart.prototype.yAxis = function() {
	var self = this;
  var tickCount = 10,
      tickSize = 6,
      tickPadding = 3,
      ticks = self.y.ticks(tickCount),
      tickFormat = self.y.tickFormat(tickCount);

  self.level1.beginPath();
  ticks.forEach(function(d) {
    self.level0.moveTo(0, self.y(d));
    self.level0.lineTo(-6, self.y(d));
  });
  self.level0.strokeStyle = "black";
  self.level0.stroke();

  self.level0.beginPath();
  self.level0.moveTo(-tickSize, 0);
  self.level0.lineTo(0.5, 0);
  self.level0.lineTo(0.5, self.internalHeight);
  self.level0.lineTo(-tickSize, self.internalHeight);
  self.level0.strokeStyle = "black";
  self.level0.stroke();

  self.level0.textAlign = "right";
  self.level0.textBaseline = "middle";
  ticks.forEach(function(d) {
    self.level0.fillText(tickFormat(d), -tickSize - tickPadding, self.y(d));
  });

  self.level0.save();
  self.level0.rotate(-Math.PI / 2);
  self.level0.textAlign = "right";
  self.level0.textBaseline = "top";
  self.level0.font = "bold 10px sans-serif";
  //context.fillText("Price (US$)", -10, 10);
  self.level0.restore();
}

LineChart.prototype.updateSize = function() {
	var self = this;

	this.level0.translate(-this.margin.left, -this.margin.top);
	this.level1.translate(-this.margin.left, -this.margin.top);
	this.level2.translate(-this.margin.left, -this.margin.top);
	this.level3.translate(-this.margin.left, -this.margin.top);
	this.idContext.translate(-this.margin.left, -this.margin.top);

	this.level0.clearRect(0, 0, this.parentRect.width,this.parentRect.height);
	this.level1.clearRect(0, 0, this.parentRect.width,this.parentRect.height);
	this.level2.clearRect(0, 0, this.parentRect.width,this.parentRect.height);
	this.level3.clearRect(0, 0, this.parentRect.width,this.parentRect.height);
	this.idContext.clearRect(0, 0, this.parentRect.width*2,this.parentRect.height*2);

	this.parentRect = this.parent.node().getBoundingClientRect();
	this.internalWidth = this.parentRect.width - this.margin.left - this.margin.right;
	this.internalHeight = this.parentRect.height - this.margin.top - this.margin.bottom;

	this.canvasRect = this.canvasList[0].node().getBoundingClientRect();
	this.canvasList.forEach(function(item, index) {
		item.attr('width', self.parentRect.width)
			.attr('height', self.parentRect.height)
			//.attr("style", "z-index: "+ index +";position:absolute;left:0px;top:0px");
	});
	this.idCanvas.attr('width', this.parentRect.width*2)
			.attr('height', this.parentRect.height*2);

	this.level0.translate(this.margin.left, this.margin.top);
	this.level1.translate(this.margin.left, this.margin.top);
	this.level2.translate(this.margin.left, this.margin.top);
	this.level3.translate(this.margin.left, this.margin.top);
	this.idContext.translate(this.margin.left*2, this.margin.top*2);
	
	this.x = d3.scale.linear().range([0, this.internalWidth]);
    this.y = d3.scale.linear().range([this.internalHeight, 0]);
    this.x2 = d3.scale.linear().range([0, this.internalWidth*2]);
    this.y2 = d3.scale.linear().range([this.internalHeight*2, 0]);

    this.x.domain(d3.extent(this.extentX, function(d) { return d; }));
	this.y.domain(d3.extent(this.extentY, function(d) { return d; }));
	this.x2.domain(d3.extent(this.extentX, function(d) { return d; }));
	this.y2.domain(d3.extent(this.extentY, function(d) { return d; }));

	this.redraw();
}

LineChart.prototype.zoom = function() {
	var self = this;

	var extentX = [this.x.invert(this.dragInfo.startX), this.x.invert(this.dragInfo.endX)];
	var extentY = [this.y.invert(this.dragInfo.startY), this.y.invert(this.dragInfo.endY)];

    this.x.domain(d3.extent(extentX, function(d) { return d; }));
	this.y.domain(d3.extent(extentY, function(d) { return d; }));
	this.x2.domain(d3.extent(extentX, function(d) { return d; }));
	this.y2.domain(d3.extent(extentY, function(d) { return d; }));

	this.redraw();
}

LineChart.prototype.reset = function() {
	var self = this;

    this.x.domain(d3.extent(self.extentX, function(d) { return d; }));
	this.y.domain(d3.extent(self.extentY, function(d) { return d; }));
	this.x2.domain(d3.extent(self.extentX, function(d) { return d; }));
	this.y2.domain(d3.extent(self.extentY, function(d) { return d; }));

	this.redraw();
}

LineChart.prototype.redrawContext = function(context, scale, data, color) {

	var self = this;

	context.clearRect(-this.margin.left*scale, -this.margin.top*scale, this.parentRect.width*scale,this.parentRect.height*scale);
    self.drawLines(context, data, color);
}

LineChart.prototype.redraw = function() {
	var self = this;

	this.level0.clearRect(-this.margin.left, -this.margin.top, this.parentRect.width,this.parentRect.height);
	this.level1.clearRect(-this.margin.left, -this.margin.top, this.parentRect.width,this.parentRect.height);
	this.level2.clearRect(-this.margin.left, -this.margin.top, this.parentRect.width,this.parentRect.height);
	this.level3.clearRect(-this.margin.left, -this.margin.top, this.parentRect.width,this.parentRect.height);
	this.idContext.clearRect(-this.margin.left*2, -this.margin.top*2, this.parentRect.width*2,this.parentRect.height*2);

	this.level1.beginPath()
	this.level1.rect(0,0,this.internalWidth,this.internalHeight);
	this.level1.clip();
	this.level1.closePath();

	this.level2.beginPath()
	this.level2.rect(0,0,this.internalWidth,this.internalHeight);
	this.level2.clip();
	this.level2.closePath();

	this.level3.beginPath()
	this.level3.rect(0,0,this.internalWidth,this.internalHeight);
	this.level3.clip();
	this.level3.closePath();

	this.level0.fillStyle = "white";
    this.level0.fillRect(0,0,this.internalWidth,this.internalHeight);
	this.idContext.lineWidth=3;
	this.level1.globalAlpha = 0.2;
	this.level1.globalCompositeOperation = "difference";
	this.level2.globalAlpha = 0.4;
	this.level2.globalCompositeOperation = "difference";
	this.level3.lineWidth=3;

    self.drawLines(self.level1, self.fullDsList, "lightgrey");
	self.drawLines(self.idContext, self.highlighted, "id");
	self.drawLines(self.level2, self.highlighted, "green");
	self.xAxis();
	self.yAxis();
}
