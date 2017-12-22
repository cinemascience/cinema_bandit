'use strict';
/**
 * A component to view two square images side-by-side.
 * Allows for zooming on images
 * 
 * Requires d3 v4
 * 
 * Author: Cameron Tauxe
 */

//Create a new TwoImageDisplay and append it to the given parent.
function TwoImageDisplay(parent, numImages) {
	this.numImages = numImages;

	//Sizing
	this.parent = parent;
	this.margin = {top: 10, right: 10, bottom: 10, left: 10};
	this.parentRect = this.parent.node().getBoundingClientRect();
	this.internalWidth = this.parentRect.width - this.margin.left - this.margin.right;
	this.internalHeight = this.parentRect.height - this.margin.top - this.margin.bottom;
	this.squareSize = Math.min(this.internalWidth/this.numImages,this.internalHeight);

	console.log(this.internalWidth, this.numImages, this.squareSize, this.internalHeight);

	this.notFoundImage = document.createElement('img');
	this.notFoundImage.src = "images/not_found.png";

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

	this.images = [];
	for (var f = 0; f < numImages; f++) {
		console.log(this.squareSize);
		var imageWrapper = this.imageWrapper.append('div')
			.attr('id','canvasWrapper' + f)
			.attr('class','canvasWrapper');
		imageWrapper.style('width', this.squareSize + 'px')
			.style('height', this.squareSize + 'px');//'' + (100/this.numImages) + '%');
		imageWrapper.style('left', '' + (this.squareSize*f) + 'px');
		var canvas = imageWrapper.append('canvas')
				.attr('id','canvas' + f)
				.attr('width',this.squareSize+'px')
				.attr('height',this.squareSize+'px');
		var context = canvas.node().getContext('2d'); 
		this.images.push({imageWrapper: imageWrapper, canvas: canvas, context: context});
	}
}

//Set the left-side image to display the image from the given url.
TwoImageDisplay.prototype.setImage = function(i, url) {
		//console.log(i, url);
	var self = this;
		self.images[i].img = document.createElement('img');
		if (!self.images[i].version) {
			self.images[i].version = 0;
		}
		self.images[i].version = self.images[i].version+1;
		var version = self.images[i].version;
		d3.select(self.images[i].img).on('load', function() {
	    	//console.log(url, 'loaded')
			self.images[i].context.drawImage(self.images[i].img, 0, 0, self.squareSize, self.squareSize);
			self.images[i].found = true;
		});
	    d3.select(self.images[i].img).on('error', function() {
		    //self.images[i].img = self.notFoundImage;
			//self.images[i].found = false;
			//self.images[i].context.drawImage(self.notFoundImage, 0, 0, this.squareSize, this.squareSize);
	    	//console.log(url)
	    	if (version == self.images[i].version) {
	    		self.images[i].img.src = "images/not_found.png"
	    	}
		});
		self.images[i].img.src = url;	
}

//Set the left-side image to display the image from the given url.
TwoImageDisplay.prototype.setLeftImage = function(url) {
	this.setImage(0,url);
}

//Set the right-side image to display the image from the given url
TwoImageDisplay.prototype.setRightImage = function(url) {
	this.setImage(1,url);
}

//Call this whenever the size of the parent changes. Redraws images to fit new size
//Resets zoom
TwoImageDisplay.prototype.updateSize = function() {
	this.parentRect = this.parent.node().getBoundingClientRect();
	this.internalWidth = this.parentRect.width - this.margin.left - this.margin.right;
	this.internalHeight = this.parentRect.height - this.margin.top - this.margin.bottom;
	this.squareSize = Math.min(this.internalWidth/this.numImages,this.internalHeight);


	this.imageWrapper.selectAll('.canvasWrapper canvas')
		.attr('width',this.squareSize+'px')
		.attr('height',this.squareSize+'px')
		.call(this.zoomBehavior
				.extent([[0,0],[this.squareSize,this.squareSize]])
				.translateExtent([[0,0],[this.squareSize,this.squareSize]]));

	this.imageWrapper.selectAll('.canvasWrapper')
		.style('width', this.squareSize+'px')
		.style('height', this.squareSize+'px');


	for (var f = 0; f < this.numImages; f++) {
		if(this.images[f].img.src) {
			this.images[f].context.drawImage(this.images[f].img, 0, 0, this.squareSize, this.squareSize);
		}

		//if (f == this.numImages - 1) {
		//	this.images[f].imageWrapper.style('right', halfWidth+'px');
		//}
		//else {
			this.images[f].imageWrapper.style('left', '' + (this.squareSize*f) + 'px');
		//}
	}
	/*
	if (this.leftImg.src)
		this.leftContext.drawImage(this.leftImg,0,0,this.squareSize,this.squareSize);
	if (this.rightImg.src)
		this.rightContext.drawImage(this.rightImg,0,0,this.squareSize,this.squareSize);
	*/
}

//Handle zoom event.
//Set the transform of both canvases to the zoom transform
TwoImageDisplay.prototype.zoom = function(transform) {
	for (var f = 0; f < this.numImages; f++) {
		var context = this.images[f].context;
		context.clearRect(0,0,this.squareSize,this.squareSize);
		context.save();
		context.translate(transform.x,transform.y);
		context.scale(transform.k,transform.k);
		if (this.images[f].img.src)
			context.drawImage(this.images[f].img,0,0,this.squareSize,this.squareSize);
		context.restore();
	}
}
