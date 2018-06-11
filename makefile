VERSION = 1.1
CINEMA_DIR = ./cinema
INSTALL_PREFIX?=build/install
COMPONENTS_VERSION = 2.4.1

all: external

external: components

submodule:
	git submodule init
	git submodule update --remote --recursive

components: submodule
	mkdir -p $(CINEMA_DIR)/components/${COMPONENTS_VERSION}/js
	cd ext/cinema_components/src; cat Database.js Component.js Glyph.js ImageSpread.js Pcoord.js PcoordCanvas.js PcoordSVG.js Query.js ScatterPlot.js ScatterPlotCanvas.js ScatterPlotSVG.js > ../../../$(CINEMA_DIR)/components/${COMPONENTS_VERSION}/js/CinemaComponents.min.js
	cp -rf ext/cinema_components/css $(CINEMA_DIR)/components/${COMPONENTS_VERSION}/css

install: all
	mkdir -p $(INSTALL_PREFIX)
	cp -rf $(CINEMA_DIR) $(INSTALL_PREFIX)/
	cp -f cinema_bandit.html $(INSTALL_PREFIX)/cinema_bandit-$(VERSION).html
	cp -rf *.json $(INSTALL_PREFIX)/

clean:
	rm -rf build
