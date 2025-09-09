📻 Internet Radio Player – README (plain-English).


Limitations on scripts as it stands:

Warning the script is still at an Alpha test stage, so it's a bit buggy (functionality wise).
Sometimes it loads without a search dialogue. I found that once there at least 1 radio station in the Favourites, users can play that demo radio station, then the Search funtion is uable.
The app needs a bit of sorting out, I still learning so any help would be very helpful.

The program is a self-contained Flask web app that lets users:

    Listen to on-line internet radio streams (Shoutcast / Icecast / any MP3 or AAC URL)
    Search by name, genre, country or language
    Save personal favourites and keep a "recently played" history

I have provided a permanent demo stream (https://cvtfradio.net:8090 , my own radio station) is always available for first-time visitors and should not be deleted!.

Quick start to run the code:

    Install Python 3.11 or newer.
    Download / unzip the folder.
    Inside the folder open a terminal and type:

pip install -r requirements.txt
python run.py

    Open your browser at http://localhost:9000
    Run the script in browser, the demo station loads automatically, and the Search panel is open.

Folder map (what each file does)

run.py	starts the local web-server
app.py	creates the Flask app and the database
routes.py	all web pages and JSON APIs
models.py	database tables (favourites, history)
radio_service.py	talks to radio-browser.info to find stations
requirements.txt	list of Python libraries to install
templates/index.html	the web page you see in the browser
static/js/radio_player.js	play / pause / volume / search buttons
static/css/custom.css	colours & layout (optional)
radio_player.db	your local database (created automatically)

For developers

    Language: Python 3.11+ (Flask) + HTML5 + Bootstrap 5 + vanilla JavaScript
    Database: SQLite (no server needed) – file is created on first run
    External API: radio-browser.info (free, no key required)
    Default port: 9000 (change in run.py if you need another)
    Environment variables (all optional):
        PORT – server port (default 9000)
        DATABASE_URL – full SQLite path or Postgres URI
        SESSION_SECRET – Flask session cookie secret

How the default station should work:

    On first start the app writes the demo row into radio_player.db and flags it as a favourite.
    The back-end should not allow delete that row – new users can remove their own stations, but the demo should stay.
    The front-end automatically starts that stream when the page opens (so new visitors hear something immediately).


Licence
Public domain – do anything you like with the code, if you like it buy a coffee.
