import requests
import json
import logging
from urllib.parse import quote_plus

logger = logging.getLogger(__name__)

class RadioDirectoryService:
    """Service for fetching radio stations from various directory APIs"""
    
    def __init__(self):
        self.radio_browser_base_url = "http://all.api.radio-browser.info/json"
        self.timeout = 10
    
    def search_stations(self, query="", genre="", country="", language="", limit=50):
        """
        Search for radio stations using radio-browser.info API
        This is a free, open-source radio directory that aggregates Shoutcast and Icecast streams
        """
        try:
            url = f"{self.radio_browser_base_url}/stations/search"
            params = {
                'limit': limit,
                'hidebroken': 'true',
                'order': 'clickcount',
                'reverse': 'true'
            }
            
            # Improved search - search in multiple fields for better results
            if query:
                # Try searching by name first, then by tag if no results
                params['name'] = query
                # Also search in description and tags for broader results
                params['tag'] = query
            if genre:
                params['tag'] = genre
            if country:
                params['country'] = country
            if language:
                params['language'] = language
            
            logger.debug(f"Fetching stations from {url} with params: {params}")
            
            response = requests.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            
            stations = response.json()
            
            # Process and normalize station data
            processed_stations = []
            for station in stations:
                # Get the best URL - prefer url_resolved, fallback to url
                stream_url = station.get('url_resolved') or station.get('url', '')
                
                # Skip stations without valid URLs
                if not stream_url:
                    continue
                    
                processed_station = {
                    'name': station.get('name', 'Unknown Station'),
                    'url': stream_url,
                    'genre': station.get('tags', '').replace(',', ', ') if station.get('tags') else '',
                    'country': station.get('country', ''),
                    'language': station.get('language', ''),
                    'bitrate': station.get('bitrate', 0),
                    'codec': station.get('codec', ''),
                    'homepage': station.get('homepage', ''),
                    'favicon': station.get('favicon', ''),
                    'tags': station.get('tags', ''),
                    'votes': station.get('votes', 0),
                    'clickcount': station.get('clickcount', 0),
                    'server_type': 'Shoutcast' if 'shout' in stream_url.lower() else 'Icecast' if 'ice' in stream_url.lower() else 'Unknown'
                }
                processed_stations.append(processed_station)
            
            logger.info(f"Successfully fetched {len(processed_stations)} stations")
            return processed_stations
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching stations: {e}")
            return []
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON response: {e}")
            return []
    
    def get_popular_stations(self, limit=30):
        """Get popular radio stations"""
        return self.search_stations(limit=limit)
    
    def get_stations_by_genre(self, genre, limit=30):
        """Get stations filtered by genre"""
        return self.search_stations(genre=genre, limit=limit)
    
    def get_stations_by_country(self, country, limit=30):
        """Get stations filtered by country"""
        return self.search_stations(country=country, limit=limit)
    
    def get_genres(self):
        """Get list of available genres"""
        try:
            url = f"{self.radio_browser_base_url}/tags"
            params = {
                'limit': 100,
                'order': 'stationcount',
                'reverse': 'true'
            }
            
            response = requests.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            
            genres = response.json()
            return [genre.get('name', '') for genre in genres if genre.get('name')]
            
        except Exception as e:
            logger.error(f"Error fetching genres: {e}")
            return ['Pop', 'Rock', 'Jazz', 'Classical', 'Electronic', 'Country', 'Hip Hop', 'News', 'Talk']
    
    def get_countries(self):
        """Get list of available countries"""
        try:
            url = f"{self.radio_browser_base_url}/countries"
            params = {
                'order': 'stationcount',
                'reverse': 'true'
            }
            
            response = requests.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            
            countries = response.json()
            return [country.get('name', '') for country in countries[:50] if country.get('name')]
            
        except Exception as e:
            logger.error(f"Error fetching countries: {e}")
            return ['United States', 'United Kingdom', 'Germany', 'France', 'Canada', 'Australia']
