from app import db
from datetime import datetime

class RadioStation(db.Model):
    """Model for storing favorite radio stations"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    genre = db.Column(db.String(100))
    country = db.Column(db.String(100))
    language = db.Column(db.String(50))
    bitrate = db.Column(db.Integer)
    codec = db.Column(db.String(20))
    homepage = db.Column(db.String(500))
    favicon = db.Column(db.String(500))
    tags = db.Column(db.String(500))
    is_favorite = db.Column(db.Boolean, default=False)
    date_added = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert station to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'name': self.name,
            'url': self.url,
            'genre': self.genre,
            'country': self.country,
            'language': self.language,
            'bitrate': self.bitrate,
            'codec': self.codec,
            'homepage': self.homepage,
            'favicon': self.favicon,
            'tags': self.tags,
            'is_favorite': self.is_favorite,
            'date_added': self.date_added.isoformat() if self.date_added else None
        }

class RecentlyPlayed(db.Model):
    """Model for tracking recently played stations"""
    id = db.Column(db.Integer, primary_key=True)
    station_name = db.Column(db.String(200), nullable=False)
    station_url = db.Column(db.String(500), nullable=False)
    played_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'station_name': self.station_name,
            'station_url': self.station_url,
            'played_at': self.played_at.isoformat() if self.played_at else None
        }
