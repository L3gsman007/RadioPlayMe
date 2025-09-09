# Internet Radio Player

## Overview

This is a web-based internet radio player that allows users to search, stream, and manage radio stations from around the world. The application provides functionality to discover stations by genre and country, maintain favorites, track recently played stations, and control playback with a built-in audio player. It leverages the radio-browser.info API to access a comprehensive database of internet radio streams.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
- **Framework**: Flask web framework with modular structure
- **Database**: SQLAlchemy ORM with SQLite as default database (configurable via DATABASE_URL environment variable)
- **Models**: Two main entities - RadioStation for storing favorite stations and RecentlyPlayed for tracking listening history
- **API Integration**: RadioDirectoryService class handles communication with radio-browser.info API for station discovery
- **Configuration**: Environment-based configuration with fallback defaults for development

### Frontend Architecture
- **Template Engine**: Jinja2 templates with Bootstrap 5 for responsive UI
- **JavaScript**: Custom RadioPlayer class managing audio playback, station management, and API communication
- **Styling**: Bootstrap dark theme with custom CSS for enhanced user experience
- **Audio Player**: HTML5 audio element with custom controls for volume, play/pause, and stop functionality

### Data Storage Solutions
- **Primary Database**: SQLAlchemy with support for multiple database backends
- **Models Design**: 
  - RadioStation: Comprehensive station metadata including genre, country, bitrate, and favorite status
  - RecentlyPlayed: Simple tracking of recently accessed stations with timestamps
- **Session Management**: Flask sessions for temporary state management

### Authentication and Authorization
- **Session Security**: Secret key-based session management (configurable via environment)
- **CORS**: Enabled for cross-origin requests to support API access
- **Security**: ProxyFix middleware for proper header handling behind proxies

### API Structure
- **RESTful Endpoints**: JSON API endpoints for station search, popular stations, and favorites management
- **Search Functionality**: Multi-parameter search supporting query, genre, country, and language filters
- **Data Serialization**: Model to_dict() methods for consistent JSON responses

## External Dependencies

### Third-Party APIs
- **radio-browser.info**: Primary data source for radio station discovery and metadata
  - Free, open-source radio directory
  - Aggregates Shoutcast and Icecast streams
  - Provides search, filtering, and popularity-based sorting

### Frontend Libraries
- **Bootstrap 5**: UI framework with dark theme support
- **Font Awesome 6.4.0**: Icon library for enhanced visual interface
- **CDN Dependencies**: All frontend libraries loaded via CDN for simplified deployment

### Python Packages
- **Flask**: Core web framework
- **Flask-SQLAlchemy**: Database ORM and integration
- **Flask-CORS**: Cross-origin request handling
- **Requests**: HTTP client for external API communication
- **Werkzeug**: WSGI utilities and proxy handling

### Infrastructure Requirements
- **Database**: Configurable database backend (defaults to SQLite)
- **Environment Variables**: Support for DATABASE_URL and SESSION_SECRET configuration
- **Deployment**: WSGI-compatible with proxy support for production deployment