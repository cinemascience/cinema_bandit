FILES=LineChart.js TwoImageDisplay.js Main.js
VERSION=$(shell cat version)
OUTPUT_PREFIX=CinemaBandit.v$(VERSION).min

all: minify
	sed -e '/<!-- bandit -->/,/<!-- bandit -->/c\\t<!-- bandit -->\n\t<link rel="stylesheet" href="css/$(OUTPUT_PREFIX).css">\n\t<script src="js/$(OUTPUT_PREFIX).js"></script>\n\t<!-- bandit -->' cinema_bandit.html > build/cinema_bandit.v$(VERSION).html
	cp -f *.json build/
	cp -rf examples build/
	mkdir -p build/css
	cp -f css/*.png build/css

minify:
	mkdir -p build/js
	mkdir -p build/css
	cd js; cat $(FILES) | babel-minify > ../build/js/$(OUTPUT_PREFIX).js
	cat css/*.css > build/css/$(OUTPUT_PREFIX).css

build/cinemascience.github.io:
	cd build; git clone https://github.com/cinemascience/cinemascience.github.io.git

deploy: minify build/cinemascience.github.io
	cd build/cinemascience.github.io; git pull
	cp -f build/css/$(OUTPUT_PREFIX).* build/cinemascience.github.io/release
	cp -f build/js/$(OUTPUT_PREFIX).* build/cinemascience.github.io/release
	cd build/cinemascience.github.io; git add .; git commit -m "Updated Cinema Bandit version $(VERSION)."; git push

clean:
	rm -rf build
