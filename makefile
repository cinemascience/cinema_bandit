FILES=LineChart.js TwoImageDisplay.js Main.js
VERSION=$(shell cat version)
OUTPUT_PREFIX=CinemaBandit.v$(VERSION).min
OUTPUT_DIR=cinema/bandit/v$(VERSION)

all: minify
	sed -e '/<!-- bandit -->/,/<!-- bandit -->/c\\t<!-- bandit -->\n\t<link rel="stylesheet" href="$(OUTPUT_DIR)/$(OUTPUT_PREFIX).css">\n\t<script src="$(OUTPUT_DIR)/$(OUTPUT_PREFIX).js"></script>\n\t<!-- bandit -->' cinema_bandit.html > build/cinema_bandit.v$(VERSION).html
	sed -e '/<!-- bandit -->/,/<!-- bandit -->/c\\t<!-- bandit -->\n\t<link rel="stylesheet" href="https://cinemascience.github.io/release/$(OUTPUT_PREFIX).css">\n\t<script src="https://cinemascience.github.io/release/$(OUTPUT_PREFIX).js"></script>\n\t<!-- bandit -->' cinema_bandit.html > build/cinema_bandit_online.v$(VERSION).html
	cp -f *.json build/
	cp -rf examples build/
	mkdir -p build/$(OUTPUT_DIR)
	cp -rf css/images build/$(OUTPUT_DIR)/

minify:
	mkdir -p build/$(OUTPUT_DIR)
	cd js; cat $(FILES) | babel-minify > ../build/$(OUTPUT_DIR)/$(OUTPUT_PREFIX).js
	cat css/*.css > build/$(OUTPUT_DIR)/$(OUTPUT_PREFIX).css

build/cinemascience.github.io:
	cd build; git clone https://github.com/cinemascience/cinemascience.github.io.git

deploy: minify build/cinemascience.github.io
	cd build/cinemascience.github.io; git pull
	cp -f build/$(OUTPUT_DIR)/$(OUTPUT_PREFIX).* build/cinemascience.github.io/release
	cp -rf build/$(OUTPUT_DIR)/images build/cinemascience.github.io/release/
	cd build/cinemascience.github.io; git add .; git commit -m "Updated Cinema Bandit version $(VERSION)."; git push

clean:
	rm -rf build
