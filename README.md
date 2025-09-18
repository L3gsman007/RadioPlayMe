📻 Internet Radio Player – README (plain-English).


The program is a self-contained Flask web app that lets users:

    Listen to on-line internet radio streams (Shoutcast / Icecast or any MP3/Ogg or AAC URL)
    Search by name, genre or country
    Save personal favourites and keep a "recently played" history

I have provided a permanent demo stream (https://cvtfradio.net:8090, its my own radio station) is always available for first-time visitors.

Quick start to run the code:

    Install Python 3.11 or newer.
    Download / unzip the folder.
    Inside the folder open a terminal and type:

pip install -r requirements.txt (or even uv sync, if you have it setup).
python run.py

    Open your browser at for example http://localhost:7860
    Run the script it opens up in the browser, the demo radio station loads (should do this automatically) and the Search panel is open.
    This allows the user to either play the demo or start a new search for their own radio stations.

    
Folder map (what each file does)

run.py-starts the local web-server
app.py-creates the Flask app and the database
routes.py-all web pages and JSON APIs
models.py-database tables (favourites, history)
radio_service.py-talks to radio-browser.info to find stations
requirements.txt-list of Python libraries to install
templates/index.htm-the web page you see in the browser
static/js/radio_player.js-play / pause / volume / search buttons
static/css/custom.css-colours & layout (optional)
radio_player.db-your local SQLite database (created automatically)

For developers

    Language: Python 3.11+ (Flask) + HTML5 + Bootstrap 5 + vanilla JavaScript
    Database: SQLite (no server needed) – file is created on first run
    External API: radio-browser.info (free, no key required)
    Default port: 9000 (change in run.py if you need another)
    Environment variables (all optional):
        PORT – server port (default 9000)
        DATABASE_URL – full SQLite path or Postgres URI
        SESSION_SECRET – Flask session cookie secret



Please email me info@cvtfradio.net
