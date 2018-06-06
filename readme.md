# BANDIT
## Version 1.1

A multi-view application for analysis and visualization of experimental data

### NOTE: Does not come with any data. Will not run without adding data.
### See databases.json for a template on adding new data

## Usage
* Select the dataset you wish to load in the drop-down menu in the header. (The first option will be loaded by default)
* The top part of the page contains a parallel coordinates chart displaying all the data points and their parameters. Filter the selection of data points by click-and-dragging a selection along one or more of the axes.
* The chart can be resized vertically by click-and-dragging the bar beneath it.
* The bottom part of the page contains the main view (on the right) and the sidebar (on the left). The sidebar displays the three available views, while the selected view is shown in the main view. Click a view in the sidebar to bring it into main view.
* With the Visar or Diffraction views active, select the Zoom/Pan tool and scroll on the viewport to zoom in on the data. Click-and-drag to pan.
* Select the Erase tool and click-and-drag over data points to grey them out.
* Select the include tool and click-and-drag over erased data points to highlight them again.
* With the Zoom/Pan tool selected, click on a data point to select it. This selection will persist even when mousing over other points or off the graph. Click on another data point to change the selection or click in a blank spot on the graph to clear it.
* With the Diffraction Image view active, scroll over one of the images to zoom on both of them. Click-and-drag to pan.

## How to Build and Install
* Build the external cinema components:
  ```
  make
  ```
* Install the application to a project location (default install path is build/install):
  ```
  make install INSTALL_PREFIX=/path/to/project_directory
  ```

## Formatting Data for Bandit
* Data for Bandit is a SpecD Cinema Database with some added dimensions used to load data into the viewer.
* Not all extra dimensions are necessary, but will be required to load Visar, Diffraction and/or diffraction images.

### Dimensions regarding Visar data
* **visar\_file**: A url to the file containing visar data for this result.
* **visar\_file1**: If specifying two visar data points for one result, this can be used to specify the URL of the first file instead of **visar\_file**.
* **visar\_file2**: If specifying two visar data points for one result, this is used to specify the URL of the second file.
* **visar\_xCol**: If a file is specified with **visar\_file**, then this specifies the number of the column in the file (beginning at zero) to read from for the x-axis of the visar data. If undefined, will use the number of the row for the x-axis.
* **visar1\_xCol**: If a file is specified with **visar1\_file**, then this specifies the number of the column in the file (beginning at zero) to read from for the x-axis of the visar data. If undefined, will use the number of the row for the x-axis.
* **visar1\_xCol**: If a file is specified with **visar2\_file**, then this specifies the number of the column in the file (beginning at zero) to read from for the x-axis of the visar data. If undefined, will use the number of the row for the x-axis.
* **visar\_yCol**: If a file is specified with **visar\_file**, then this specifies the number of the column in the file (beginning at zero) to read from for the y-axis of the visar data. If undefined, will use first two columns for x and y respectively. (overrides xCol being undefined)
* **visar1\_yCol**: If a file is specified with **visar1\_file**, then this specifies the number of the column in the file (beginning at zero) to read from for the y-axis of the visar data. If undefined, will use first two columns for x and y respectively. (overrides xCol being undefined)
* **visar2\_yCol**: If a file is specified with **visar2\_file**, then this specifies the number of the column in the file (beginning at zero) to read from for the y-axis of the visar data. If undefined, will use first two columns for x and y respectively. (overrides xCol being undefined)
* **visar\_delimiter**: The character to use to deliminate tokens in the visar file.
###Dimensions regarding Diffraction data
* **diffraction\_file**: A url to the file containing diffraction data for this result.
* **diffraction\_file1**: If specifying two diffraction data points for one result, this can be used to specify the URL of the first file instead of **diffraction\_file**.
* **diffraction\_file2**: If specifying two diffraction data points for one result, this is used to specify the URL of the second file.
* **diffraction\_xCol**: If a file is specified with **diffraction\_file**, then this specifies the number of the column in the file (beginning at zero) to read from for the x-axis of the diffraction data. If undefined, will use the number of the row for the x-axis.
* **diffraction1\_xCol**: If a file is specified with **diffraction1\_file**, then this specifies the number of the column in the file (beginning at zero) to read from for the x-axis of the diffraction data. If undefined, will use the number of the row for the x-axis.
* **diffraction1\_xCol**: If a file is specified with **diffraction2\_file**, then this specifies the number of the column in the file (beginning at zero) to read from for the x-axis of the diffraction data. If undefined, will use the number of the row for the x-axis.
* **diffraction\_yCol**: If a file is specified with **diffraction\_file**, then this specifies the number of the column in the file (beginning at zero) to read from for the y-axis of the diffraction data. If undefined, will use first two columns for x and y respectively. (overrides xCol being undefined)
* **diffraction1\_yCol**: If a file is specified with **diffraction1\_file**, then this specifies the number of the column in the file (beginning at zero) to read from for the y-axis of the diffraction data. If undefined, will use first two columns for x and y respectively. (overrides xCol being undefined)
* **diffraction2\_yCol**: If a file is specified with **diffraction2\_file**, then this specifies the number of the column in the file (beginning at zero) to read from for the y-axis of the diffraction data. If undefined, will use first two columns for x and y respectively. (overrides xCol being undefined)
* **diffraction\_delimiter**: The character to use to deliminate tokens in the diffraction file.
### Dimensions regarding Diffraction Images
* **diffraction\_image**: The url to the first diffraction image for this result
* **diffraction\_image1**: Can be used instead of **diffraction\_image**.
* **diffraction\_image2**: The url to the second diffraction image for this result.

## Issues
* On Safari, the browser may reach a limit for files opened (Safari does not release files from file:// requests until the page is closed) and refuse to load more data when loading particularly large data sets.

## Changelog
### Version 1.1
 * Significant performance improvements. Data is gradually streamed in while it loads/draws so more hangups
 * Generalized data-loading. Can now view any properly-formatted dataset.
### Version 1.0
 * Initial Release
