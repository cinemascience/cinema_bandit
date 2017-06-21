#BANDIT
##Version 1.0

A multi-view application for analysis and visualization of experimental data

###NOTE: Does not come with any data. Will not run without adding data.
The details regarding how data will be formatted and ingested are still undetermined and are subject to change.
If you're cloning this repository, it's assumed that you already have data and/or an older version of Bandit and are simply getting the latest version of hte viewer.

##Usage
* Select the dataset you wish to load in the drop-down menu in the header. (The first option will be loaded by default)
* The top part of the page contains a parallel coordinates chart displaying all the data points and their parameters. Filter the selection of data points by click-and-dragging a selection along one or more of the axes.
* The chart can be resized vertically by click-and-dragging the bar beneath it.
* The bottom part of the page contains the main view (on the right) and the sidebar (on the left). The sidebar displays the three available views, while the selected view is shown in the main view. Click a view in the sidebar to bring it into main view.
* With the Visar or Diffraction views active, select the Zoom/Pan tool and scroll on the viewport to zoom in on the data. Click-and-drag to pan.
* Select the Erase tool and click-and-drag over data points to grey them out.
* Select the include tool and click-and-drag over erased data points to highlight them again.
* With the Zoom/Pan tool selected, click on a data point to select it. This selection will persist even when mousing over other points or off the graph. Click on another data point to change the selection or click in a blank spot on the graph to clear it.
* With the Diffraction Image view active, scroll over one of the images to zoom on both of them. Click-and-drag to pan.

##Issues
* On Safari, the browser may reach a limit for files opened (Safari does not release files from file:// requests until the page is closed) and refuse to load more data when loading particularly large data sets.