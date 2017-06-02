function LineChart(parent, getData, onLineHover) {
	var self = this;
	this.parent = parent;
	this.onLineHover = onLineHover;
    this.highlighted = [];
	this.parent.attr("style", "position:relative;left:0px;top:0px;");
	canvas = parent.append("canvas")
		.attr("width", 800)
		.attr("height", 500)
		.attr("style", "z-index: 1;position:relative;left:0px;top:0px;");
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
		.attr("height", this.canvasRect.width*2)
		.attr("style", "z-index: 2;position:absolute;left:0px;top:0px;visibility: hidden;");
		//.attr("style", "z-index: 2;position:absolute;left:0px;top:0px");
	this.idContext = canvas.node().getContext("2d");
	this.idContext.fillStyle = "white";
	this.idContext.translate(this.margin.left*2, this.margin.top*2);
	this.idContext.lineWidth=3;
    this.idContext.clearRect(0, 0, this.internalWidth*2,this.internalHeight*2);
	canvas = parent.append("canvas")
		.attr("width", this.canvasRect.width)
		.attr("height", this.canvasRect.width)
		.attr("style", "z-index: 2;position:absolute;left:0px;top:0px;");
	this.level1 = canvas.node().getContext("2d");
	this.level1.fillStyle = "white";
	this.level1.globalAlpha = 0.2;
	this.level1.globalCompositeOperation = "difference";
	this.level1.translate(this.margin.left, this.margin.top);
    this.level1.clearRect(0, 0, this.internalWidth,this.internalHeight);
	canvas = parent.append("canvas")
		.attr("width", this.canvasRect.width)
		.attr("height", this.canvasRect.width)
		.attr("style", "z-index: 3;position:absolute;left:0px;top:0px;");
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
		.attr("height", this.canvasRect.width)
		.attr("style", "z-index: 4;position:absolute;left:0px;top:0px;");

	d3.select(canvas.node()).on("mousemove", function() {
    	//console.log('' + d3.event.offsetX + ',' + d3.event.offsetY);
    	var imageData = self.idContext.getImageData(d3.event.offsetX*2-1, d3.event.offsetY*2-1, 3, 3).data;
    	//console.log(imageData);
    	var vals = []
    	for (f = 0; f < imageData.length/4; f++) {
    		vals.push(imageData[f*4] + imageData[f*4 + 1]*256 + imageData[f*4 + 2]*256*256);
    	}
    	vals.sort();
    	//console.log(vals);

    	var val = -1;
    	var freq = 0;
    	for (f = 0; f < vals.length; f++) {
    		if (freq == 4) {
    			break;
    		}

    		if (val != vals[f]) {
    			val = vals[f];
    			freq = 0;
    		}

    		freq = freq + 1;
    	}

    	var found = false;
    	for (f = 0; f < self.highlighted.length; f++) {
    		if (self.highlighted[f].id == (val-1)) {
    			found = true;
    			break;
    		}
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

	this.level3 = canvas.node().getContext("2d");
	this.level3.fillStyle = "white";
	this.level3.translate(this.margin.left, this.margin.top);
    this.level3.clearRect(0, 0, this.internalWidth,this.internalHeight);
    this.level3.lineWidth=3;
    this.getData = getData;
    this.x = d3.scale.linear().range([0, this.internalWidth]);
    this.y = d3.scale.linear().range([this.internalHeight, 0]);
    this.x2 = d3.scale.linear().range([0, this.internalWidth*2]);
    this.y2 = d3.scale.linear().range([this.internalHeight*2, 0]);
    this.xh = d3.scale.linear().range([0, this.internalWidth]);
    this.yh = d3.scale.linear().range([this.internalHeight, 0]);
    this.fullDsList = [];
    this.loadedData = {};
    // all = 0; highlighted = 1;
    this.drawMode = 0;


}

LineChart.prototype.loadData = function(query) {
	var self = this;
	var dataSetsProcessed = 0;
	var extentX = [];
	var extentY = [];

	query.forEach(function(item, index) {
		var d = self.getData(item);
		var id = item;
		var dsList = [];

	    d.forEach(function(dataSet, dataSetIndex) {

	    	d3.text(dataSet.file, function(text) {

	    		if (text) {
	    			var rows = d3.tsv.parseRows(text).map(function(row) {
						return row.map(function(value) {
				    		return +value;
						});
		            });

			    	var rows2 = []
			    	if (dataSet.column >= 0) {	
				    	rows.forEach(function(item, index) {
							if (index % 1 == 0) {
						    	rows2.push({x : index, y : item[dataSet.column]});
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

				    extentX.push.apply(extentX, d3.extent(rows2, function(d) { return d.x; }));
				    extentY.push.apply(extentY, d3.extent(rows2, function(d) { return d.y; }));

					if (dataSetIndex == d.length - 1) {
				    	self.loadedData[id] = dsList;
				    }
	    		}

				if (dataSetIndex == d.length - 1) {
					dataSetsProcessed = dataSetsProcessed + 1;
				}

	    		if (dataSetsProcessed == query.length) {
				    self.x.domain(d3.extent(extentX, function(d) { return d; }));
					self.y.domain(d3.extent(extentY, function(d) { return d; }));
				    self.x2.domain(d3.extent(extentX, function(d) { return d; }));
					self.y2.domain(d3.extent(extentY, function(d) { return d; }));
					self.xh.domain(d3.extent(extentX, function(d) { return d; }));
					self.yh.domain(d3.extent(extentY, function(d) { return d; }));

					self.drawLines(self.level1, self.fullDsList, "lightgrey");
					self.drawLines(self.idContext, self.fullDsList, "id");
					self.drawLines(self.level2, self.fullDsList, "green");
					self.highlighted = self.fullDsList;
					self.xAxis();
					self.yAxis();
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
					context.moveTo(self.drawMode == 1 ? self.xh(item.x) : self.x(item.x), self.drawMode == 1 ? self.yh(item.y) : self.y(item.y));
		    	}
		    	else {
					context.lineTo(self.drawMode == 1 ? self.xh(item.x) : self.x(item.x), self.drawMode == 1 ? self.yh(item.y) : self.y(item.y));
		    	}
	   		}
	    });
		context.stroke();
	});
}

LineChart.prototype.highlightData = function(query, color) {
	var self = this;
	//self.level1.fillRect(0,0,self.internalWidth,self.internalHeight);
	//self.level2.fillRect(0,0,self.internalWidth,self.internalHeight);
	self.level2.clearRect(0, 0, this.internalWidth,this.internalHeight);
	//this.drawLines(self.level1, self.fullDsList, fallbackColor);

	var extentX = [];
	var extentY = [];

	var dsList = [];
	query.forEach(function(item, index) {
		dsList.push.apply(dsList, self.loadedData[item]);
	});

	dsList.forEach(function(item, index) {
		extentX.push.apply(extentX, d3.extent(item.rows, function(d) { return d.x; }));
		extentY.push.apply(extentY, d3.extent(item.rows, function(d) { return d.y; }));
	});
	
	self.xh.domain(d3.extent(extentX, function(d) { return d; }));
	self.yh.domain(d3.extent(extentY, function(d) { return d; }));

	this.drawLines(self.level2, dsList, color);
	//this.drawLines(self.idContext, dsList, 'id');
	this.highlighted = dsList;
}

LineChart.prototype.selectData = function(query) {
	var self = this;
	self.level3.clearRect(0, 0, this.internalWidth,this.internalHeight);

	var dsList = [];
	query.forEach(function(item, index) {
		dsList.push.apply(dsList, self.loadedData[item]);
	});

	//console.log(query);

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