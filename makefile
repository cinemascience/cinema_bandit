VERSION = 1.1
BUILD_DIR = build
INSTALL_DIR = $(BUILD_DIR)/../../project

all: external
	mkdir -p $(BUILD_DIR)
	cp -rf cinema $(BUILD_DIR)/
	cp -f cinema_bandit.html $(BUILD_DIR)/cinema_bandit-$(VERSION).html
	cp -f databases.json $(BUILD_DIR)/

external: components

submodule:
	git submodule init
	git submodule update --remote --recursive

components: submodule
	mkdir -p $(BUILD_DIR)/cinema/components/2.4.1/js
	cd ext/cinema_components/src; cat Database.js Component.js Glyph.js ImageSpread.js Pcoord.js PcoordCanvas.js PcoordSVG.js Query.js ScatterPlot.js ScatterPlotCanvas.js ScatterPlotSVG.js > ../../../$(BUILD_DIR)/cinema/components/2.4.1/js/CinemaComponents.min.js
	cp -rf ext/cinema_components/css $(BUILD_DIR)/cinema/components/2.4.1/css

install: all
	mkdir -p $(INSTALL_DIR)
	cp -rf $(BUILD_DIR)/cinema $(INSTALL_DIR)/
	cp -rf $(BUILD_DIR)/*.html $(INSTALL_DIR)/
	cp -rf $(BUILD_DIR)/*.json $(INSTALL_DIR)/

clean:
	rm -rf $(BUILD_DIR)
