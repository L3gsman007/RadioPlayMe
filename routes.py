from flask import render_template, request, jsonify, session
from app import app, db
from models import RadioStation, RecentlyPlayed
from radio_service import RadioDirectoryService
import logging
from flask import abort


logger = logging.getLogger(__name__)
radio_service = RadioDirectoryService()

DEFAULT_URL = "https://cvtfradio.net:8090"

@app.route('/')
def index():
    # guaranteed station (demo is seeded in app.py)
    default = RadioStation.query.filter_by(url=DEFAULT_URL).first()
    return render_template("index.html",
                         default_station=default.to_dict(),
                         open_search=True)

# ----------  REST OF YOUR ORIGINAL ROUTES  ----------
@app.route('/api/search')
def search_stations():
    query   = request.args.get('q', '')
    genre   = request.args.get('genre', '')
    country = request.args.get('country', '')
    limit   = int(request.args.get('limit', 50))
    stations = radio_service.search_stations(query=query, genre=genre, country=country, limit=limit)
    return jsonify({'success': True, 'stations': stations, 'count': len(stations)})

@app.route('/api/popular')
def get_popular_stations():
    limit    = int(request.args.get('limit', 30))
    stations = radio_service.get_popular_stations(limit=limit)
    if not stations:                      # API dead → inject demo
        stations = [{
            'name': 'CVT Radio – Demo', 'url': DEFAULT_URL, 'genre': 'Demo',
            'country': 'Internet', 'language': 'English', 'bitrate': 128,
            'codec': 'MP3', 'homepage': 'https://cvtfradio.net',
            'favicon': '', 'tags': 'demo,starter', 'votes': 999,
            'clickcount': 999, 'server_type': 'Shoutcast'
        }]
    return jsonify({'success': True, 'stations': stations, 'count': len(stations)})

@app.route('/api/genres')
def get_genres():
    return jsonify({'success': True, 'genres': radio_service.get_genres()})

@app.route('/api/countries')
def get_countries():
    return jsonify({'success': True, 'countries': radio_service.get_countries()})

@app.route('/api/favorites', methods=['GET'])
def get_favorites():
    favorites = RadioStation.query.filter_by(is_favorite=True).all()
    return jsonify({'success': True, 'favorites': [s.to_dict() for s in favorites]})

@app.route('/api/favorites', methods=['POST'])
def add_favorite():
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({'success': False, 'error': 'Station URL is required'}), 400
    existing = RadioStation.query.filter_by(url=data['url']).first()
    if existing:
        existing.is_favorite = True
    else:
        db.session.add(RadioStation(**{**data, 'is_favorite': True}))
    try:
        db.session.commit()
        return jsonify({'success': True, 'message': 'Station added to favorites'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding favorite: {e}")
        return jsonify({'success': False, 'error': 'Failed to add favorite'}), 500

@app.route('/api/favorites/<int:station_id>', methods=['DELETE'])
def remove_favorite(station_id):
    station = RadioStation.query.get_or_404(station_id)
    if station.url == DEFAULT_URL:
        return jsonify({'success': False, 'error': 'Default demo station cannot be removed'}), 403
    try:
        db.session.delete(station)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Station removed from favorites'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error removing favorite: {e}")
        return jsonify({'success': False, 'error': 'Failed to remove favorite'}), 500

@app.route('/api/recently-played', methods=['GET'])
def get_recently_played():
    recent = RecentlyPlayed.query.order_by(RecentlyPlayed.played_at.desc()).limit(10).all()
    return jsonify({'success': True, 'recent': [r.to_dict() for r in recent]})

@app.route('/api/recently-played', methods=['POST'])
def add_recently_played():
    data = request.get_json()
    if not data or 'station_url' not in data:
        return jsonify({'success': False, 'error': 'Station URL is required'}), 400
    RecentlyPlayed.query.filter_by(station_url=data['station_url']).delete()
    recent = RecentlyPlayed(station_name=data.get('station_name', 'Unknown Station'), station_url=data['station_url'])
    try:
        db.session.add(recent)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding to recently played: {e}")
        return jsonify({'success': False, 'error': 'Failed to add to recently played'}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'error': 'Internal server error'}), 500




PERMANENT_URL = "https://cvtfradio.net:8090"   # same URL you seeded

@app.route('/api/favorites/<int:station_id>', methods=['DELETE'])
def remove_favorite(station_id):
    station = RadioStation.query.get_or_404(station_id)

    #  hard lock – even admins cannot delete the demo
    if station.url == PERMANENT_URL:
        abort(403, description="Demo station is protected and cannot be removed")

    db.session.delete(station)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Station removed from favorites'})