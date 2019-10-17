//'use strict';
/**
 * A component to view 3d data in 2d using color as the third dimension.
 * This component uses d3 to create a heatmap
 * 
 * Requires d3 v4
 * 
 * Author: Andres Quan
 * Date: Sep. 20 2019
 */

//Create a new HeatMapDisplay and append it to the given parent.
function HeatMapDisplay(parent, getData) {

	//Sizing
	this.parent = parent;
	this.margin = {top: 80, right: 25, bottom: 40, left: 40};
	this.parentRect = this.parent.node().getBoundingClientRect();
	this.internalWidth = this.parentRect.width - this.margin.left - this.margin.right;
	this.internalHeight = this.parentRect.height - this.margin.top - this.margin.bottom;
	this.squareSize = Math.min(this.internalWidth,this.internalHeight);

	var self = this;

	//Data collection function
	this.getData = getData;


	this.heatMapWrapper = parent.append('div')
		.attr('class','heatMapDisplay')  //This is what will link this object to the CSS
		.style('position','absolute')
		.style('top', this.margin.top+'px')
		.style('right', this.margin.right+'px')
		.style('bottom', this.margin.bottom+'px')
		.style('left', this.margin.left+'px');

	
	//AQ
	this.mainCanvas = this.heatMapWrapper.append('div')
		.attr('id','mainCanvasWrapper')
		.attr('class','canvasWrapper')
		.append('canvas')
			.attr('id','mainCanvas')
			.attr('width',this.squareSize+'px')
			.attr('height',this.squareSize+'px');
	this.mainContext = this.mainCanvas.node().getContext('2d');
	this.mainCSV;

}

//Set the csv file to use image.
//HeatMapDisplay.prototype.setCSV = function(url) {
//	var self = this;
//	this.mainCSV = url;
//}

//Read the data
HeatMapDisplay.prototype.create = function(heatMapWrapper) {
	var myGroups;
	var myVars;
	this.heatMapWrapper = heatMapWrapper;
	var csvFile = this.getData(0, "FILE_heatmap_path")[0];
	d3.csv(csvFile, function(data){
	myGroups = d3.map(data, function(d){
		return d.raw_scattering_angle;
	}).keys();
	myVars = d3.map(data, function(d){
		return d.y_position;
	}).keys();

	// Labels of row and columns -> unique identifier of the column called 'group' and 'variable'

	//this.heatMapWrapper = this.displays[5].heatMapWrapper;
	var heatMapWrapper = this.heatMapWrapper;

	var width = this.internalWidth;
	var height = this.internalHeight;
	var margin = this.margin;
		
		// Build X scales and axis:
	var x = d3.scaleBand()
	    .range([ 0, width ])
	    .domain(myGroups)
	    .padding(0.00);
	    heatMapWrapper.append("g")
	    .style("font-size", 15)
	    .attr("transform", "translate(0," + height + ")")
	    //keep every hundredth tick mark, and include the first and last.
	    .call(d3.axisBottom(x).tickValues(x.domain().filter(function(d,i){return !(i%100) || i === x.domain().length - 1})).tickSize(6))
	    .select(".domain").remove();
	    heatMapWrapper.append("text")
	    .attr("transform",
		"translate(" + (width/2) + " ," +
		(height + margin.top - 45) + ")")
	    .style("text-anchor", "middle")
	    .text("Scattering Angle (degrees)");


	// Build Y scales and axis:
	var y = d3.scaleBand()
	    .range([ height, 0 ])
	    .domain(myVars)
	    .padding(0.00);
	    heatMapWrapper.append("g")
	    .style("font-size", 15)
	    .call(d3.axisLeft(y).tickSize(0))
	    .select(".domain").remove();

	    heatMapWrapper.append("text")
	    .attr("transform", "rotate(-90)")
	    .attr("y", 0 - margin.left)
	    .attr("x",0 - (height / 2))
	    .attr("dy", "1em")
	    .style("text-anchor", "middle")
	    .text("Shot Count");

	// Build color scale
	var myColor = d3.scaleSequential()
	    .interpolator(d3.interpolateViridis)
	    .domain([1,100]);

	// create a tooltip
	var tooltip = d3.select("#my_dataviz")
	    .append("div")
	    .style("opacity", 0)
	    .attr("class", "tooltip")
	    .style("background-color", "white")
	    .style("border", "solid")
	    .style("border-width", "2px")
	    .style("border-radius", "5px")
	    .style("padding", "5px")

	// Three function that change the tooltip when user hover / move / leave a cell
	var mouseover = function(d) {
	    tooltip
		.style("opacity", 1)
	    d3.select(this)
		.style("stroke", "white")
		.style("opacity", 1)
	};
	var mousemove = function(d) {
	    tooltip
		.html("The raw intensity of<br/>this cell is: " + d.raw_intensity + "<br/>The raw scattering angle of<br/>this cell is: " +  d.raw_scattering_angle + " degrees")
		.style("left", (d3.mouse(this)[0]+70) + "px")
		.style("top", (d3.mouse(this)[1]) + "px")
	};
	var mouseleave = function(d) {
	    tooltip
		.style("opacity", 0)
	    d3.select(this)
		.style("stroke", "none")
		.style("opacity", 1)
	};

	// add the squares
	    heatMapWrapper.selectAll()
	    .data(data, function(d) {return d.raw_scattering_angle + ':' + d.y_position;})
	    .enter()
	    .append("rect")
	    .attr("x", function(d) { return x(d.raw_scattering_angle) })
	    .attr("y", function(d) { return y(d.y_position) })
	    .attr("rx", 0)
	    .attr("ry", 0)
	    .attr("width", x.bandwidth() + 1)
	    .attr("height", y.bandwidth() + 1 )
	    .style("fill", function(d) { return myColor(d.normalized_intensity)} )
	    .style("stroke-width", 4)
	    .style("stroke", "none")
	    .style("opacity", 1)
	    .on("mouseover", mouseover)
	    .on("mousemove", mousemove)
	    .on("mouseleave", mouseleave)
	});

	// Add title to graph
	heatMapWrapper.append("text")
	.attr("x", 0)
	.attr("y", -50)
	.attr("text-anchor", "left")
	.style("font-size", "22px")
	.text("XRD Data Contour Map");

	// Add subtitle to graph
	heatMapWrapper.append("text")
	.attr("x", 0)
	.attr("y", -20)
	.attr("text-anchor", "left")
	.style("font-size", "14px")
	.style("fill", "grey")
	.style("max-width", 400)
	.text("This produces in Javascript with D3, the same visualization that Blake Sturtevant did in Origin");
}

//Call this whenever the size of the parent changes. Redraws image to fit new size
//Resets zoom
HeatMapDisplay.prototype.updateSize = function() {
	this.parentRect = this.parent.node().getBoundingClientRect();
	this.internalWidth = this.parentRect.width - this.margin.left - this.margin.right;
	this.internalHeight = this.parentRect.height - this.margin.top - this.margin.bottom;
	this.squareSize = Math.min(this.internalWidth,this.internalHeight);

	this.heatMapWrapper.selectAll('.canvasWrapper canvas')
		.attr('width',this.squareSize+'px')
		.attr('height',this.squareSize+'px')

}

