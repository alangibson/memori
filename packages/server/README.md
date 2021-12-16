# Memori Server

> If you want to run the Memori application, see @memori/app

## Installation

### Run local server on Linux

```
# Install CouchDB
sudo apt update && sudo apt install -y curl apt-transport-https gnupg
curl https://couchdb.apache.org/repo/keys.asc | gpg --dearmor | sudo tee /usr/share/keyrings/couchdb-archive-keyring.gpg >/dev/null 2>&1
source /etc/os-release
echo "deb [signed-by=/usr/share/keyrings/couchdb-archive-keyring.gpg] https://apache.jfrog.io/artifactory/couchdb-deb/ ${UBUNTU_CODENAME|VERSION_CODENAME} main" \
    | sudo tee /etc/apt/sources.list.d/couchdb.list >/dev/null
sudo apt update
sudo apt install -y couchdb

# Install Tesseract
sudo apt install tesseract-ocr

# Clone Memori application
git clone https://github.com/alangibson/memori.git

# Install Vosk
pip3 install vosk
curl -L -O http://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip
pushd memori/etc
unzip vosk-model-en-us-0.22.zip
popd

# Run the server
cd memori/server
npm install -D
npm run start:test
# Open 'Connect via secure tunnel' from output in the browser
```

### Run local server on Windows

```
Install .NET Framework 3.5 https://www.microsoft.com/en-us/download/details.aspx?id=21
Install CouchDB from https://couchdb.apache.org/#download

Install git from https://git-scm.com/download/win

Install node >= 16 from https://nodejs.org/en/download/
If you don't have Python and Visual Studio Build Tools already installed,
  check "Automatically install the necessary tools"
  on the "Tools for native modules" screen

pip install vosk

git clone https://github.com/alangibson/memori.git
cd memori\server

npm i --also=dev

Download and extract http://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip
  to memori\server\etc

set PATH=%cd%\node_modules\ffmpeg-static;%PATH%
set NODE_ENV=test
set NODE_OPTIONS=--max_old_space_size=4096
npm start
```

### Set up production server on Linux

```
curl -sL https://deb.nodesource.com/setup_16.x -o nodesource_setup.sh
sudo bash nodesource_setup.sh
sudo apt install -y nodejs python-is-python3

git clone https://github.com/alangibson/memori.git
cd memori/server

# Install webhook
# https://dev.to/severo/using-webhooks-to-update-a-self-hosted-jekyll-blog-59al
sudo cp webhook.conf /etc/
sudo apt install webhook

npm i --also=dev

sudo cp memori.service /etc/systemd/system/memori.service
sudo systemctl daemon-reload
sudo systemctl enable memori
sudo systemctl start memori
```


## Usage

### Client

Register a directory for crawling then crawl it

``` 
npm run cli remember file://home/directory
npm run cli crawl
```

Register an RSS feed for crawling then crawl it

``` 
npm run cli remember https://example.com/feed.rss
npm run cli crawl
```

### Start server

```
npm exec -- @memori/server start
```

### Run extension in Firefox with hot reload

```
cd extension
npx web-ext run --verbose

# 1) Go go about:debugging 2) Click "This Firefox" 3) Click "Inspect" under plugin
```

### Update production server

```
cd ~/memori/server

git pull
npm i --also=dev

systemctl restart memori
journalctl -n 60 -f -u memori
```

### Generate development TLS key

```
openssl req  -nodes -new -x509  -keyout dev.key -out dev.cert
```

## Use cases

Add an rss feed that will have its entries added to memory

```
npm run cli remember --crawl https://example.com/blog/feed.rss
npm run cli crawl
```

Add a site with an feed in <head> links that will have its entries added to memory

```
npm run cli remember --crawl https://example.com/blog
npm run cli crawl
```

Add a site that will be crawled recursively. We will stay in this domain.

```
npm run cli remember --crawl https://example.com/
npm run cli crawl
```

Add a site we will watch for updates (but not crawl). If updated, a new revision
will be created in PouchDB

```
npm run cli remember --watch https://example.com/
npm run cli crawl
```


## Interesting URLs

http://jeroen.github.io/images/testocr.png
OCR test image

https://www.electrical4u.com/voltage-or-electric-potential-difference/
Blocked by Cloudflare

https://www.made.com/ilaria-extra-large-cluster-pendant-multicolour-brass
@type Product, 3DModel, BreadcrumbList

https://antigonejournal.com/2021/10/gender-in-latin-and-beyond/
@type Article, Person, BreadcrumbList, WebPage, ImageObject, Organization, WebSite

https://www.ebay.at/itm/373696055676?hash=item570205497c:g:dLAAAOSwCbJeTEsf
@ype Product

https://github.com/maxvfischer/DIY-CNC-machine

https://www.mozilla.org/en-US/firefox/new/
@type SoftwareApplication

https://www.imdb.com/title/tt0281686
@Movie

https://www.st.com/resource/en/datasheet/l78.pdf
https://www.sparkfun.com/datasheets/Components/BC546.pdf
pdf

https://www.youtube.com/watch?v=RkJUJ5X2f7w
@VideoObject

https://www.langmuirsystems.com/crossfire
Product page with no Product @type

https://soundcloud.com/chapo-trap-house
@type MusicGroup

https://www.chapotraphouse.com/
@type WebSite

https://audioboom.com/channel/Blank-Check
Podcast site with embedded rss feed



## Resources

https://json-ld.org/playground/index.html

https://validator.schema.org/