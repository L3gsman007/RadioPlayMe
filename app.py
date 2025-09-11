import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix


#  crash if secret not set in production
if os.getenv("FLASK_ENV") == "production" and not os.getenv("SESSION_SECRET"):
    raise RuntimeError("SESSION_SECRET must be set in production")

app.secret_key = os.environ["SESSION_SECRET"]   # no fallback


logging.basicConfig(level=logging.INFO)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///radio_player.db")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_recycle": 300, "pool_pre_ping": True}
db.init_app(app)

with app.app_context():
    import models
    import routes
    db.create_all()

# ----------------------------------------------------------
#  PERMANENT DEMO STATION (auto-plays, undeletable)
# ----------------------------------------------------------
DEFAULT_URL   = "https://cvtfradio.net:8090"
DEFAULT_NAME  = "CVT Radio – Demo"

def _seed_demo():
    from models import RadioStation
    if RadioStation.query.first():          # DB already has rows → skip
        return
    db.session.add(RadioStation(
        name=DEFAULT_NAME, url=DEFAULT_URL, genre="Demo",
        country="Internet", language="English", bitrate=128,
        codec="MP3", homepage="https://cvtfradio.net",
        favicon="", tags="demo,starter", is_favorite=True))
    db.session.commit()

with app.app_context():
    _seed_demo()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv("PORT", 5000)), debug=False)