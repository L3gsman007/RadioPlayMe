from flask import render_template, request, jsonify, session
from app import app, db
from models import RadioStation, RecentlyPlayed
from radio_service import RadioDirectoryService
import logging

logger = logging.getLogger(__name__)
radio_service = RadioDirectoryService()

@app.route('/')
def index():
    """Main page route"""
    return render_template('index.html')

@app.route('/api/search')
def search_stations():
    """API endpoint for searching radio stations"""
    query = request.args.get('q', '')
    genre = request.args.get('genre', '')
    country = request.args.get('country', '')
    limit = int(request.args.get('limit', 50))
    
    logger.debug(f"Search request: query='{query}', genre='{genre}', country='{country}'")
    
    stations = radio_service.search_stations(
        query=query,
        genre=genre,
        country=country,
        limit=limit
    )
    
    return jsonify({
        'success': True,
        'stations': stations,
        'count': len(stations)
    })

@app.route('/api/popular')
def get_popular_stations():
    """Get popular radio stations"""
    limit = int(request.args.get('limit', 30))
    stations = radio_service.get_popular_stations(limit=limit)
    
    return jsonify({
        'success': True,
        'stations': stations,
        'count': len(stations)
    })

@app.route('/api/genres')
def get_genres():
    """Get available genres"""
    genres = radio_service.get_genres()
    return jsonify({
        'success': True,
        'genres': genres
    })

@app.route('/api/countries')
def get_countries():
    """Get available countries"""
    countries = radio_service.get_countries()
    return jsonify({
        'success': True,
        'countries': countries
    })

@app.route('/api/favorites', methods=['GET'])
def get_favorites():
    """Get user's favorite stations"""
    favorites = RadioStation.query.filter_by(is_favorite=True).all()
    return jsonify({
        'success': True,
        'favorites': [station.to_dict() for station in favorites]
    })

@app.route('/api/favorites', methods=['POST'])
def add_favorite():
    """Add a station to favorites"""
    data = request.get_json()
    
    if not data or 'url' not in data:
        return jsonify({'success': False, 'error': 'Station URL is required'}), 400
    
    # Check if station already exists in favorites
    existing_station = RadioStation.query.filter_by(url=data['url']).first()
    
    if existing_station:
        existing_station.is_favorite = True
    else:
        # Create new favorite station
        station = RadioStation(
            name=data.get('name', 'Unknown Station'),
            url=data['url'],
            genre=data.get('genre', ''),
            country=data.get('country', ''),
            language=data.get('language', ''),
            bitrate=data.get('bitrate', 0),
            codec=data.get('codec', ''),
            homepage=data.get('homepage', ''),
            favicon=data.get('favicon', ''),
            tags=data.get('tags', ''),
            is_favorite=True
        )
        db.session.add(station)
    
    try:
        db.session.commit()
        return jsonify({'success': True, 'message': 'Station added to favorites'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding favorite: {e}")
        return jsonify({'success': False, 'error': 'Failed to add favorite'}), 500

@app.route('/api/favorites/<int:station_id>', methods=['DELETE'])
def remove_favorite(station_id):
    """Remove a station from favorites"""
    station = RadioStation.query.get(station_id)
    
    if not station:
        return jsonify({'success': False, 'error': 'Station not found'}), 404
    
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
    """Get recently played stations"""
    recent = RecentlyPlayed.query.order_by(RecentlyPlayed.played_at.desc()).limit(10).all()
    return jsonify({
        'success': True,
        'recent': [item.to_dict() for item in recent]
    })

@app.route('/api/recently-played', methods=['POST'])
def add_recently_played():
    """Add a station to recently played"""
    data = request.get_json()
    
    if not data or 'station_url' not in data:
        return jsonify({'success': False, 'error': 'Station URL is required'}), 400
    
    # Remove existing entry for this station to avoid duplicates
    RecentlyPlayed.query.filter_by(station_url=data['station_url']).delete()
    
    # Add new entry
    recent_entry = RecentlyPlayed(
        station_name=data.get('station_name', 'Unknown Station'),
        station_url=data['station_url']
    )
    
    try:
        db.session.add(recent_entry)
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
