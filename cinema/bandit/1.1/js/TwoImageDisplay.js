//'use strict';
/**
 * A component to view two square images side-by-side.
 * Allows for zooming on images
 * 
 * Requires d3 v4
 * 
 * Author: Cameron Tauxe
 */

//Create a new TwoImageDisplay and append it to the given parent.
function TwoImageDisplay(parent) {

	//Sizing
	this.parent = parent;
	this.margin = {top: 10, right: 10, bottom: 10, left: 10};
	this.parentRect = this.parent.node().getBoundingClientRect();
	this.internalWidth = this.parentRect.width - this.margin.left - this.margin.right;
	this.internalHeight = this.parentRect.height - this.margin.top - this.margin.bottom;
	this.squareSize = Math.min(this.internalWidth/2,this.internalHeight);

	//Zooming
	var self = this;
	this.zoomBehavior = d3.zoom()
		.scaleExtent([1,20])
		.on('zoom',function() {
			self.zoom(d3.event.transform);
		});

	this.imageWrapper = parent.append('div')
		.attr('class','twoImageDisplay')
		.style('position','absolute')
		.style('top', this.margin.top+'px')
		.style('right', this.margin.right+'px')
		.style('bottom', this.margin.bottom+'px')
		.style('left', this.margin.left+'px')
		.call(this.zoomBehavior
				.extent([[0,0],[this.squareSize,this.squareSize]])
				.translateExtent([[0,0],[this.squareSize,this.squareSize]]));

	this.leftCanvas = this.imageWrapper.append('div')
		.attr('id','leftCanvasWrapper')
		.attr('class','canvasWrapper')
		.append('canvas')
			.attr('id','leftCanvas')
			.attr('width',this.squareSize+'px')
			.attr('height',this.squareSize+'px');
	this.leftContext = this.leftCanvas.node().getContext('2d');
	this.leftImg;
	
	this.rightCanvas = this.imageWrapper.append('div')
		.attr('id','rightCanvasWrapper')
		.attr('class','canvasWrapper')
		.append('canvas')
			.attr('id','rightCanvas')
			.attr('width',this.squareSize+'px')
			.attr('height',this.squareSize+'px');
	this.rightContext = this.rightCanvas.node().getContext('2d');
	this.rightImg;
}

//Set the left-side image to display the image from the given url.
TwoImageDisplay.prototype.setLeftImage = function(url) {
	var self = this;
	this.leftImg = document.createElement('img');
	d3.select(this.leftImg).on('load', function() {
		self.leftContext.drawImage(self.leftImg, 0, 0, self.squareSize, self.squareSize);
	});
	this.leftImg.src = url;
}

//Set the right-side image to display the image from the given url
TwoImageDisplay.prototype.setRightImage = function(url) {
	var self = this;
	this.rightImg = document.createElement('img');
	d3.select(this.rightImg).on('load', function() {
		self.rightContext.drawImage(self.rightImg, 0, 0, self.squareSize, self.squareSize);
	});
	this.rightImg.src = url;
}

//Call this whenever the size of the parent changes. Redraws images to fit new size
//Resets zoom
TwoImageDisplay.prototype.updateSize = function() {
	this.parentRect = this.parent.node().getBoundingClientRect();
	this.internalWidth = this.parentRect.width - this.margin.left - this.margin.right;
	this.internalHeight = this.parentRect.height - this.margin.top - this.margin.bottom;
	this.squareSize = Math.min(this.internalWidth/2,this.internalHeight);

	this.imageWrapper.selectAll('.canvasWrapper canvas')
		.attr('width',this.squareSize+'px')
		.attr('height',this.squareSize+'px')
		.call(this.zoomBehavior
				.extent([[0,0],[this.squareSize,this.squareSize]])
				.translateExtent([[0,0],[this.squareSize,this.squareSize]]));

	if (this.leftImg.src)
		this.leftContext.drawImage(this.leftImg,0,0,this.squareSize,this.squareSize);
	if (this.rightImg.src)
		this.rightContext.drawImage(this.rightImg,0,0,this.squareSize,this.squareSize);
}

//Handle zoom event.
//Set the transform of both canvases to the zoom transform
TwoImageDisplay.prototype.zoom = function(transform) {
	this.leftContext.clearRect(0,0,this.squareSize,this.squareSize);
	this.leftContext.save();
	this.leftContext.translate(transform.x,transform.y);
	this.leftContext.scale(transform.k,transform.k);
	if (this.leftImg.src)
		this.leftContext.drawImage(this.leftImg,0,0,this.squareSize,this.squareSize);
	this.leftContext.restore();

	this.rightContext.clearRect(0,0,this.squareSize,this.squareSize);
	this.rightContext.save();
	this.rightContext.translate(transform.x,transform.y);
	this.rightContext.scale(transform.k,transform.k);
	if (this.rightImg.src)
		this.rightContext.drawImage(this.rightImg,0,0,this.squareSize,this.squareSize);
	this.rightContext.restore();

}