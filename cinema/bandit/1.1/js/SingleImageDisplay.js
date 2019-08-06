//'use strict';
/**
 * A component to view a single image
 * Allows for zooming on images
 * 
 * Requires d3 v4
 * 
 * Author: Andres Quan, Cameron Tauxe
 */

//Create a new SingleImageDisplay and append it to the given parent.
function SingleImageDisplay(parent) {

	//Sizing
	this.parent = parent;
	this.margin = {top: 10, right: 10, bottom: 10, left: 10};
	this.parentRect = this.parent.node().getBoundingClientRect();
	this.internalWidth = this.parentRect.width - this.margin.left - this.margin.right;
	this.internalHeight = this.parentRect.height - this.margin.top - this.margin.bottom;
	this.squareSize = Math.min(this.internalWidth,this.internalHeight);

	//Zooming
	var self = this;
	this.zoomBehavior = d3.zoom()
		.scaleExtent([1,20])
		.on('zoom',function() {
			self.zoom(d3.event.transform);
		});

	this.imageWrapper = parent.append('div')
		.attr('class','oneImageDisplay')
		.style('position','absolute')
		.style('top', this.margin.top+'px')
		.style('right', this.margin.right+'px')
		.style('bottom', this.margin.bottom+'px')
		.style('left', this.margin.left+'px')
		.call(this.zoomBehavior
				.extent([[0,0],[this.squareSize,this.squareSize]])
				.translateExtent([[0,0],[this.squareSize,this.squareSize]]));
	
	//AQ
	this.mainCanvas = this.imageWrapper.append('div')
		.attr('id','mainCanvasWrapper')
		.attr('class','canvasWrapper')
		.append('canvas')
			.attr('id','mainCanvas')
			.attr('width',this.squareSize+'px')
			.attr('height',this.squareSize+'px');
	this.mainContext = this.mainCanvas.node().getContext('2d');
	this.mainImg;

}

//Set THE image. The only image
SingleImageDisplay.prototype.setImage = function(url) {
	var self = this;
	this.mainImg = document.createElement('img');
	d3.select(this.mainImg).on('load', function() {
		self.mainContext.drawImage(self.mainImg, 0, 0, self.squareSize, self.squareSize);
	});
	this.mainImg.src = url;
}

//Call this whenever the size of the parent changes. Redraws image to fit new size
//Resets zoom
SingleImageDisplay.prototype.updateSize = function() {
	this.parentRect = this.parent.node().getBoundingClientRect();
	this.internalWidth = this.parentRect.width - this.margin.left - this.margin.right;
	this.internalHeight = this.parentRect.height - this.margin.top - this.margin.bottom;
	this.squareSize = Math.min(this.internalWidth,this.internalHeight);

	this.imageWrapper.selectAll('.canvasWrapper canvas')
		.attr('width',this.squareSize+'px')
		.attr('height',this.squareSize+'px')
		.call(this.zoomBehavior
				.extent([[0,0],[this.squareSize,this.squareSize]])
				.translateExtent([[0,0],[this.squareSize,this.squareSize]]));

	if (this.mainImg.src)
		this.mainContext.drawImage(this.mainImg,0,0,this.squareSize,this.squareSize);
}

//Handle zoom event.
SingleImageDisplay.prototype.zoom = function(transform) {
	this.mainContext.clearRect(0,0,this.squareSize,this.squareSize);
	this.mainContext.save();
	this.mainContext.translate(transform.x,transform.y);
	this.mainContext.scale(transform.k,transform.k);
	if (this.mainImg.src)
		this.mainContext.drawImage(this.mainImg,0,0,this.squareSize,this.squareSize);
	this.mainContext.restore();

}
