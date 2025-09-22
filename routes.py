from flask import render_template, request, jsonify, session, redirect, url_for
from app import app, db
from models import RadioStation, RecentlyPlayed, User, UserFavorite
from radio_service import RadioDirectoryService
import logging
from flask import abort

logger = logging.getLogger(__name__)
radio_service = RadioDirectoryService()

DEFAULT_URL = "https://cvtfradio.net:8090"

def _get_current_user():
    user_id = session.get('user_id')
    if user_id:
        return User.query.get(user_id)
    return None

@app.route('/')
def index():
    # guaranteed station (demo is seeded in app.py)
    default = RadioStation.query.filter_by(url=DEFAULT_URL).first()
    current_user = _get_current_user()
    return render_template("index.html",
                         default_station=default.to_dict(),
                         open_search=True,
                         current_user=current_user)

# Sign-up page
@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        data = request.form or request.get_json() or {}
        username = data.get('username')
        password = data.get('password')
        if not username or not password:
            return render_template('signup.html', error="Username and password required")
        if User.query.filter_by(username=username).first():
            return render_template('signup.html', error="User already exists")
        user = User(username=username)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        session['user_id'] = user.id
        return redirect(url_for('index'))
    return render_template('signup.html')

# Log-in page
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.form or request.get_json() or {}
        username = data.get('username')
        password = data.get('password')
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            session['user_id'] = user.id
            return redirect(url_for('index'))
        return render_template('login.html', error="Invalid credentials")
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('index'))

# ----------
# REST OF YOUR ORIGINAL ROUTES
# ----------

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
    if not stations:
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

# Per-user favorites (requires login)
@app.route('/api/favorites', methods=['GET'])
def get_favorites():
    user = _get_current_user()
    if user:
        favs = UserFavorite.query.filter_by(user_id=user.id).all()
        stations = [f.station.to_dict() for f in favs]
        return jsonify({'success': True, 'favorites': stations})
    else:
        # Public/global favorites (existing behavior)
        favorites = RadioStation.query.filter_by(is_favorite=True).all()
        return jsonify({'success': True, 'favorites': [s.to_dict() for s in favorites]})

@app.route('/api/favorites', methods=['POST'])
def add_favorite():
    user = _get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'Station data required'}), 400

    station_id = data.get('id') or data.get('station_id')
    if station_id:
        station = RadioStation.query.get(station_id)
        if not station:
            return jsonify({'success': False, 'error': 'Station not found'}), 404
    else:
        # If only URL is provided, try to find or create a station
        url = data.get('url')
        if not url:
            return jsonify({'success': False, 'error': 'Station URL required'}), 400
        station = RadioStation.query.filter_by(url=url).first()
        if not station:
            station = RadioStation(**{k: v for k, v in data.items()})
            db.session.add(station)
            db.session.flush()  # get id
    # Create user-specific favorite
    existing = UserFavorite.query.filter_by(user_id=user.id, station_id=station.id).first()
    if existing:
        return jsonify({'success': True, 'message': 'Already a favorite'})
    fav = UserFavorite(user_id=user.id, station_id=station.id)
    db.session.add(fav)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Station added to favorites'})

@app.route('/api/favorites/<int:station_id>', methods=['DELETE'])
def remove_favorite(station_id):
    user = _get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401
    station = RadioStation.query.get_or_404(station_id)
    fav = UserFavorite.query.filter_by(user_id=user.id, station_id=station.id).first()
    if not fav:
        return jsonify({'success': False, 'error': 'Not a favorite'}), 404
    db.session.delete(fav)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Station removed from favorites'})

@app.route('/api/recently-played', methods=['GET'])
def get_recently_played():
    user = _get_current_user()
    if not user:
        return jsonify({'success': True, 'recent': []})
    recent = RecentlyPlayed.query.filter_by(user_id=user.id).order_by(RecentlyPlayed.played_at.desc()).limit(10).all()
    return jsonify({'success': True, 'recent': [r.to_dict() for r in recent]})

@app.route('/api/recently-played', methods=['POST'])
def add_recently_played():
    user = _get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401
    data = request.get_json()
    if not data or 'station_url' not in data:
        return jsonify({'success': False, 'error': 'Station URL is required'}), 400
    # Optional: prevent duplicates per-user
    RecentlyPlayed.query.filter_by(user_id=user.id, station_url=data['station_url']).delete()
    recent = RecentlyPlayed(
        user_id=user.id,
        station_name=data.get('station_name', 'Unknown Station'),
        station_url=data['station_url']
    )
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