class RadioPlayer {
    constructor() {
        this.audio = document.getElementById('audio-player');
        this.currentStation = null;
        this.isPlaying = false;
        this.favorites = [];
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.metadataInterval = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupToggleButtons();
        this.loadGenres();
        this.loadCountries();
        this.loadFavorites(); // Load saved favorites on startup
        // Don't auto-load popular stations for minimalist startup
    }

    initializeElements() {
        // Player controls
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.playPauseIcon = document.getElementById('play-pause-icon');
        this.stopBtn = document.getElementById('stop-btn');
        this.favoriteBtn = document.getElementById('favorite-btn');
        this.recordBtn = document.getElementById('record-btn');
        this.volumeSlider = document.getElementById('volume-slider');
        this.searchToggleBtn = document.getElementById('search-toggle-btn');
        this.streamInfoToggleBtn = document.getElementById('stream-info-toggle-btn');
        this.stationsToggleBtn = document.getElementById('stations-toggle-btn');
        
        // Display elements
        this.currentStationEl = document.getElementById('current-station');
        this.currentMetadataEl = document.getElementById('current-metadata');
        this.stationFavicon = document.getElementById('station-favicon');
        this.playerCard = document.getElementById('player-card');
        
        // Metadata elements
        this.metadataSection = document.getElementById('metadata-section');
        this.nowPlayingEl = document.getElementById('now-playing');
        this.streamBitrateEl = document.getElementById('stream-bitrate');
        this.streamFormatEl = document.getElementById('stream-format');
        this.serverTypeEl = document.getElementById('server-type');
        this.listenerCountEl = document.getElementById('listener-count');
        this.connectionStatusEl = document.getElementById('connection-status');
        
        // Section toggles
        this.searchSection = document.getElementById('search-section');
        this.streamInfoSection = document.getElementById('stream-info-section');
        this.stationsSection = document.getElementById('stations-section');
        this.welcomeCanvas = document.getElementById('welcome-canvas');
        
        // Extended metadata elements
        this.extendedNowPlaying = document.getElementById('extended-now-playing');
        this.extendedBitrate = document.getElementById('extended-bitrate');
        this.extendedFormat = document.getElementById('extended-format');
        this.extendedSampleRate = document.getElementById('extended-sample-rate');
        this.extendedServer = document.getElementById('extended-server');
        this.extendedListeners = document.getElementById('extended-listeners');
        this.extendedStreamUrl = document.getElementById('extended-stream-url');
        this.extendedConnectionStatus = document.getElementById('extended-connection-status');
        
        // Form elements
        this.searchForm = document.getElementById('search-form');
        this.searchQuery = document.getElementById('search-query');
        this.streamUrl = document.getElementById('stream-url');
        this.genreSelect = document.getElementById('genre-select');
        this.countrySelect = document.getElementById('country-select');
        
        // Container elements
        this.stationsContainer = document.getElementById('stations-container');
        this.favoritesContainer = document.getElementById('favorites-container');
        this.stationsTitle = document.getElementById('stations-title');
        this.loadingSpinner = document.getElementById('loading-spinner');
        
        // Quick action buttons
        this.popularBtn = document.getElementById('popular-btn');
        this.recentBtn = document.getElementById('recent-btn');
        this.favoritesBtn = document.getElementById('favorites-btn');
    }

    setupEventListeners() {
        // Audio events
        this.audio.addEventListener('loadstart', () => this.showLoading(true));
        this.audio.addEventListener('canplay', () => this.showLoading(false));
        this.audio.addEventListener('play', () => this.updatePlayButton(true));
        this.audio.addEventListener('pause', () => this.updatePlayButton(false));
        this.audio.addEventListener('error', (e) => this.handleAudioError(e));
        this.audio.addEventListener('loadedmetadata', () => this.updateMetadata());

        // Player controls
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.stopBtn.addEventListener('click', () => this.stopPlayback());
        this.favoriteBtn.addEventListener('click', () => this.toggleFavorite());
        this.recordBtn.addEventListener('click', () => this.toggleRecording());
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        
        // Toggle buttons
        this.searchToggleBtn.addEventListener('click', () => this.toggleSearchSection());
        this.streamInfoToggleBtn.addEventListener('click', () => this.toggleStreamInfoSection());
        this.stationsToggleBtn.addEventListener('click', () => this.toggleStationsSection());

        // Search form
        this.searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.searchStations();
        });

        // Quick actions
        this.popularBtn.addEventListener('click', () => this.loadPopularStations());
        this.recentBtn.addEventListener('click', () => this.loadRecentlyPlayed());
        this.favoritesBtn.addEventListener('click', () => this.loadFavorites());

        // Set initial volume
        this.setVolume(this.volumeSlider.value);
    }

    async loadGenres() {
        try {
            const response = await fetch('/api/genres');
            const data = await response.json();
            
            if (data.success) {
                this.genreSelect.innerHTML = '<option value="">All Genres</option>';
                data.genres.forEach(genre => {
                    const option = document.createElement('option');
                    option.value = genre;
                    option.textContent = genre;
                    this.genreSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading genres:', error);
        }
    }

    async loadCountries() {
        try {
            const response = await fetch('/api/countries');
            const data = await response.json();
            
            if (data.success) {
                this.countrySelect.innerHTML = '<option value="">All Countries</option>';
                data.countries.forEach(country => {
                    const option = document.createElement('option');
                    option.value = country;
                    option.textContent = country;
                    this.countrySelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading countries:', error);
        }
    }

    async searchStations() {
        const query = this.searchQuery.value.trim();
        const streamUrl = this.streamUrl.value.trim();
        const genre = this.genreSelect.value;
        const country = this.countrySelect.value;

        // Handle direct URL input
        if (streamUrl) {
            // Validate URL format
            try {
                const url = new URL(streamUrl);
                const customStation = {
                    name: this.getStationNameFromUrl(streamUrl),
                    url: streamUrl,
                    genre: 'Custom Stream',
                    country: '',
                    bitrate: 0,
                    codec: 'Unknown',
                    server_type: 'Custom'
                };
                this.displayStations([customStation], 'Custom Stream');
                this.showSuccess('Custom stream added. Click to play!');
                return;
            } catch (e) {
                this.showError('Please enter a valid stream URL (e.g., https://cvtfradio.net:8090)');
                return;
            }
        }

        // Also check if query looks like a URL
        if (query && (query.startsWith('http://') || query.startsWith('https://'))) {
            try {
                const url = new URL(query);
                const customStation = {
                    name: this.getStationNameFromUrl(query),
                    url: query,
                    genre: 'Custom Stream',
                    country: '',
                    bitrate: 0,
                    codec: 'Unknown',
                    server_type: 'Custom'
                };
                this.displayStations([customStation], 'Custom Stream');
                this.showSuccess('Custom stream added. Click to play!');
                return;
            } catch (e) {
                // Continue with normal search if URL is invalid
            }
        }

        if (!query && !genre && !country) {
            this.showError('Please enter a search term, select a genre/country, or provide a stream URL');
            return;
        }

        this.showLoading(true);
        
        try {
            const params = new URLSearchParams();
            if (query) params.append('q', query);
            if (genre) params.append('genre', genre);
            if (country) params.append('country', country);
            
            const response = await fetch(`/api/search?${params}`);
            const data = await response.json();
            
            if (data.success) {
                this.displayStations(data.stations, 'Search Results');
            } else {
                this.showError('Search failed. Please try again.');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Search failed. Please check your connection.');
        } finally {
            this.showLoading(false);
        }
    }

    async loadPopularStations() {
        this.showLoading(true);
        
        try {
            const response = await fetch('/api/popular');
            const data = await response.json();
            
            if (data.success) {
                this.displayStations(data.stations, 'Popular Stations');
            } else {
                this.showError('Failed to load popular stations');
            }
        } catch (error) {
            console.error('Error loading popular stations:', error);
            this.showError('Failed to load stations. Please check your connection.');
        } finally {
            this.showLoading(false);
        }
    }

    async loadRecentlyPlayed() {
        this.showLoading(true);
        
        try {
            const response = await fetch('/api/recently-played');
            const data = await response.json();
            
            if (data.success) {
                const stations = data.recent.map(item => ({
                    name: item.station_name,
                    url: item.station_url,
                    genre: '',
                    country: '',
                    bitrate: 0
                }));
                this.displayStations(stations, 'Recently Played');
            } else {
                this.showError('Failed to load recently played stations');
            }
        } catch (error) {
            console.error('Error loading recently played:', error);
            this.showError('Failed to load recently played stations.');
        } finally {
            this.showLoading(false);
        }
    }

    async loadFavorites() {
        try {
            const response = await fetch('/api/favorites');
            const data = await response.json();
            
            if (data.success) {
                this.favorites = data.favorites;
                this.displayFavorites(data.favorites);
            } else {
                this.showError('Failed to load favorites');
            }
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    }

    displayStations(stations, title) {
        this.stationsTitle.textContent = title;
        
        if (stations.length === 0) {
            this.stationsContainer.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="fas fa-search fa-3x mb-3"></i>
                    <p>No stations found. Try adjusting your search criteria.</p>
                </div>
            `;
            return;
        }

        const stationsHTML = stations.map(station => this.createStationHTML(station)).join('');
        this.stationsContainer.innerHTML = stationsHTML;
        
        // Add click listeners to station cards
        this.stationsContainer.querySelectorAll('.station-card').forEach(card => {
            card.addEventListener('click', () => {
                const stationData = JSON.parse(card.dataset.station);
                this.playStation(stationData);
            });
        });
    }

    displayFavorites(favorites) {
        if (favorites.length === 0) {
            this.favoritesContainer.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="far fa-heart fa-3x mb-3"></i>
                    <p>No favorite stations yet. Add some stations to your favorites!</p>
                </div>
            `;
            return;
        }

        const favoritesHTML = favorites.map(station => {
            return `
                <div class="row mb-3">
                    <div class="col">
                        <div class="card station-card" style="cursor: pointer;" data-station='${JSON.stringify(station)}'>
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="card-title mb-1">${this.escapeHtml(station.name)}</h6>
                                        <small class="text-muted">
                                            ${station.genre ? this.escapeHtml(station.genre) : 'Unknown Genre'} • 
                                            ${station.country ? this.escapeHtml(station.country) : 'Unknown Country'}
                                        </small>
                                    </div>
                                    <button class="btn btn-outline-danger btn-sm remove-favorite" data-station-id="${station.id}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.favoritesContainer.innerHTML = favoritesHTML;

        // Add event listeners
        this.favoritesContainer.querySelectorAll('.station-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.remove-favorite')) {
                    const stationData = JSON.parse(card.dataset.station);
                    this.playStation(stationData);
                    bootstrap.Modal.getInstance(document.getElementById('favoritesModal')).hide();
                }
            });
        });

        this.favoritesContainer.querySelectorAll('.remove-favorite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFavorite(btn.dataset.stationId);
            });
        });
    }

    createStationHTML(station) {
        const serverTypeBadge = station.server_type && station.server_type !== 'Unknown' ? 
            `<span class="badge bg-secondary me-2">${station.server_type}</span>` : '';
            
        return `
            <div class="row mb-3">
                <div class="col">
                    <div class="card station-card" style="cursor: pointer;" data-station='${JSON.stringify(station)}'>
                        <div class="card-body">
                            <div class="d-flex align-items-center">
                                ${station.favicon ? `<img src="${this.escapeHtml(station.favicon)}" alt="" class="me-3" style="width: 32px; height: 32px;" onerror="this.style.display='none'">` : ''}
                                <div class="flex-grow-1">
                                    <div class="d-flex align-items-center mb-1">
                                        <h6 class="card-title mb-0 me-2">${this.escapeHtml(station.name)}</h6>
                                        ${serverTypeBadge}
                                    </div>
                                    <small class="text-muted">
                                        ${station.genre ? this.escapeHtml(station.genre) : 'Unknown Genre'} • 
                                        ${station.country ? this.escapeHtml(station.country) : 'Unknown Country'}
                                        ${station.bitrate ? ` • ${station.bitrate}kbps` : ''}
                                        ${station.codec ? ` • ${station.codec.toUpperCase()}` : ''}
                                    </small>
                                </div>
                                <div class="ms-auto">
                                    <i class="fas fa-play text-primary"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async playStation(station) {
        if (!station.url) {
            this.showError('Invalid station URL');
            return;
        }

        // Stop recording if active
        if (this.isRecording) {
            this.stopRecording();
        }

        this.currentStation = station;
        this.playerCard.style.display = 'block';
        
        // Update display
        this.currentStationEl.textContent = station.name;
        this.currentMetadataEl.textContent = 'Loading...';
        
        // Update favicon
        if (station.favicon) {
            this.stationFavicon.src = station.favicon;
            this.stationFavicon.style.display = 'block';
        } else {
            this.stationFavicon.style.display = 'none';
        }

        // Show and initialize metadata section
        this.metadataSection.style.display = 'block';
        this.initializeMetadataDisplay(station);

        // Enable controls
        this.playPauseBtn.disabled = false;
        this.stopBtn.disabled = false;
        this.favoriteBtn.disabled = false;
        this.recordBtn.disabled = false;
        this.searchToggleBtn.disabled = false;
        this.streamInfoToggleBtn.disabled = false;
        // Stations toggle is always enabled

        // Check if station is in favorites
        this.updateFavoriteButton();

        // Try to play the stream with better error handling
        await this.tryPlayStream(station.url);
    }

    async tryPlayStream(url) {
        try {
            // Reset audio element
            this.audio.pause();
            this.audio.currentTime = 0;
            
            // Try different URL formats for better compatibility
            const streamUrls = this.getStreamUrls(url);
            
            for (const streamUrl of streamUrls) {
                try {
                    this.currentMetadataEl.textContent = 'Connecting...';
                    this.audio.src = streamUrl;
                    
                    // Add a timeout for connection attempts
                    const playPromise = this.audio.play();
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Connection timeout')), 15000);
                    });
                    
                    await Promise.race([playPromise, timeoutPromise]);
                    
                    // If successful, add to recently played and return
                    this.addToRecentlyPlayed(this.currentStation);
                    this.showSuccess(`Now playing: ${this.currentStation.name}`);
                    this.updateConnectionStatus('Connected');
                    this.startMetadataUpdates();
                    // Auto-collapse search section after successful play
                    this.autoCollapseSearchSection();
                    return;
                    
                } catch (error) {
                    console.warn(`Failed to play ${streamUrl}:`, error);
                    // Continue to next URL
                }
            }
            
            // If all URLs failed
            throw new Error('All stream URLs failed');
            
        } catch (error) {
            console.error('Playback error:', error);
            this.handleStreamFailure(error);
        }
    }

    getStreamUrls(originalUrl) {
        const urls = [originalUrl];
        
        // Try common stream URL variations
        if (!originalUrl.includes('/;')) {
            urls.push(originalUrl + '/;');
        }
        if (!originalUrl.includes('stream') && !originalUrl.endsWith('/')) {
            urls.push(originalUrl + '/stream');
            urls.push(originalUrl + '/;stream.mp3');
        }
        
        return urls;
    }

    handleStreamFailure(error) {
        let errorMessage = 'Stream is currently unavailable';
        
        if (error.message.includes('NETWORK_ERR') || error.message.includes('timeout')) {
            errorMessage = 'Connection failed - the station may be offline';
        } else if (error.message.includes('MEDIA_ERR_SRC_NOT_SUPPORTED')) {
            errorMessage = 'Stream format not supported by your browser';
        } else if (error.message.includes('MEDIA_ERR_DECODE')) {
            errorMessage = 'Unable to decode audio stream';
        }
        
        this.showError(errorMessage + '. Try another station or refresh the page.');
        this.currentMetadataEl.textContent = 'Stream unavailable';
        this.updatePlayButton(false);
        this.updateConnectionStatus('Error');
        this.stopMetadataUpdates();
    }

    togglePlayPause() {
        if (this.audio.paused) {
            this.audio.play().catch(error => {
                console.error('Play error:', error);
                this.showError('Failed to play audio');
            });
        } else {
            this.audio.pause();
        }
    }

    stopPlayback() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.currentMetadataEl.textContent = 'Stopped';
        
        // Stop recording if active
        if (this.isRecording) {
            this.stopRecording();
        }
        
        // Stop metadata updates and update status
        this.stopMetadataUpdates();
        this.updateConnectionStatus('Disconnected');
    }

    async toggleRecording() {
        if (!this.currentStation || !this.isPlaying) {
            this.showError('Start playing a station before recording');
            return;
        }

        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        try {
            // Create a MediaStream from the audio element
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaElementSource(this.audio);
            const destination = audioContext.createMediaStreamDestination();
            
            source.connect(destination);
            source.connect(audioContext.destination); // Continue playing through speakers

            // Set up MediaRecorder
            this.mediaRecorder = new MediaRecorder(destination.stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.downloadRecording();
            };

            this.mediaRecorder.start(1000); // Record in 1-second chunks
            this.isRecording = true;
            this.updateRecordButton();
            this.showSuccess('Recording started');

        } catch (error) {
            console.error('Recording error:', error);
            this.showError('Failed to start recording. Your browser may not support this feature.');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.updateRecordButton();
            this.showSuccess('Recording stopped');
        }
    }

    downloadRecording() {
        if (this.recordedChunks.length === 0) {
            this.showError('No recording data available');
            return;
        }

        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const stationName = this.currentStation.name.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${stationName}_${timestamp}.webm`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.recordedChunks = [];
    }

    updateRecordButton() {
        const icon = this.recordBtn.querySelector('i');
        if (this.isRecording) {
            icon.className = 'fas fa-stop';
            this.recordBtn.className = 'btn btn-danger me-3';
            this.recordBtn.title = 'Stop Recording';
        } else {
            icon.className = 'fas fa-microphone';
            this.recordBtn.className = 'btn btn-outline-danger me-3';
            this.recordBtn.title = 'Start Recording';
        }
    }

    async toggleFavorite() {
        if (!this.currentStation) return;

        const isFavorite = this.isStationFavorite(this.currentStation);
        
        try {
            if (isFavorite) {
                const favoriteStation = this.favorites.find(f => f.url === this.currentStation.url);
                if (favoriteStation) {
                    await this.removeFavorite(favoriteStation.id);
                }
            } else {
                await this.addFavorite(this.currentStation);
            }
        } catch (error) {
            console.error('Favorite toggle error:', error);
            this.showError('Failed to update favorites');
        }
    }

    async addFavorite(station) {
        try {
            const response = await fetch('/api/favorites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(station)
            });

            const data = await response.json();
            if (data.success) {
                this.loadFavorites(); // Refresh favorites
                this.updateFavoriteButton();
                this.showSuccess('Station added to favorites');
            } else {
                this.showError(data.error || 'Failed to add favorite');
            }
        } catch (error) {
            console.error('Add favorite error:', error);
            this.showError('Failed to add favorite');
        }
    }

    async removeFavorite(stationId) {
        try {
            const response = await fetch(`/api/favorites/${stationId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            if (data.success) {
                this.loadFavorites(); // Refresh favorites
                this.updateFavoriteButton();
                this.showSuccess('Station removed from favorites');
            } else {
                this.showError(data.error || 'Failed to remove favorite');
            }
        } catch (error) {
            console.error('Remove favorite error:', error);
            this.showError('Failed to remove favorite');
        }
    }

    async addToRecentlyPlayed(station) {
        try {
            await fetch('/api/recently-played', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    station_name: station.name,
                    station_url: station.url
                })
            });
        } catch (error) {
            console.error('Add to recently played error:', error);
        }
    }

    isStationFavorite(station) {
        return this.favorites.some(fav => fav.url === station.url);
    }

    updateFavoriteButton() {
        if (!this.currentStation) return;
        
        const isFavorite = this.isStationFavorite(this.currentStation);
        const icon = this.favoriteBtn.querySelector('i');
        
        if (isFavorite) {
            icon.className = 'fas fa-heart';
            this.favoriteBtn.className = 'btn btn-danger';
        } else {
            icon.className = 'far fa-heart';
            this.favoriteBtn.className = 'btn btn-outline-secondary';
        }
    }

    updatePlayButton(isPlaying) {
        const icon = this.playPauseBtn.querySelector('i');
        icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
        this.isPlaying = isPlaying;
    }

    setVolume(value) {
        this.audio.volume = value / 100;
    }

    updateMetadata() {
        if (this.currentStation) {
            const info = [];
            if (this.currentStation.genre) info.push(this.currentStation.genre);
            if (this.currentStation.bitrate) info.push(`${this.currentStation.bitrate}kbps`);
            if (this.currentStation.codec) info.push(this.currentStation.codec.toUpperCase());
            
            this.currentMetadataEl.textContent = info.length > 0 ? info.join(' • ') : 'Now Playing';
        }
    }

    handleAudioError(e) {
        console.error('Audio error:', e);
        let errorMessage = 'Playback error occurred';
        
        if (this.audio.error) {
            switch (this.audio.error.code) {
                case this.audio.error.MEDIA_ERR_NETWORK:
                    errorMessage = 'Network error - the stream may be temporarily unavailable';
                    break;
                case this.audio.error.MEDIA_ERR_DECODE:
                    errorMessage = 'Audio format not supported by your browser';
                    break;
                case this.audio.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorMessage = 'Stream not available - try another station';
                    break;
                default:
                    errorMessage = 'Stream unavailable - this is common with internet radio';
            }
        }
        
        this.showError(errorMessage + '. Try another station or refresh the page.');
        this.currentMetadataEl.textContent = 'Stream unavailable';
        
        // Reset play button
        this.updatePlayButton(false);
    }

    showLoading(show) {
        this.loadingSpinner.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        // Create a simple toast-like notification
        const toast = document.createElement('div');
        toast.className = 'alert alert-danger alert-dismissible position-fixed';
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }

    showSuccess(message) {
        const toast = document.createElement('div');
        toast.className = 'alert alert-success alert-dismissible position-fixed';
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }

    initializeMetadataDisplay(station) {
        // Set initial station metadata
        this.streamBitrateEl.textContent = station.bitrate ? `${station.bitrate} kbps` : 'Unknown';
        this.streamFormatEl.textContent = station.codec ? station.codec.toUpperCase() : 'Unknown';
        this.serverTypeEl.textContent = station.server_type || 'Unknown';
        this.listenerCountEl.textContent = station.clickcount || '-';
        this.nowPlayingEl.textContent = 'Connecting...';
        this.updateConnectionStatus('Connecting');
    }

    updateConnectionStatus(status) {
        let badgeClass = 'bg-secondary';
        let statusText = status;

        switch(status) {
            case 'Connected':
                badgeClass = 'bg-success';
                break;
            case 'Connecting':
                badgeClass = 'bg-warning';
                break;
            case 'Disconnected':
            case 'Error':
                badgeClass = 'bg-danger';
                break;
            default:
                badgeClass = 'bg-secondary';
        }

        this.connectionStatusEl.innerHTML = `<span class="badge ${badgeClass}">${statusText}</span>`;
    }

    startMetadataUpdates() {
        // Clear any existing interval
        this.stopMetadataUpdates();
        
        // Start periodic metadata updates
        this.metadataInterval = setInterval(() => {
            this.updateStreamMetadata();
        }, 5000); // Update every 5 seconds
        
        // Initial update
        this.updateStreamMetadata();
    }

    stopMetadataUpdates() {
        if (this.metadataInterval) {
            clearInterval(this.metadataInterval);
            this.metadataInterval = null;
        }
    }

    async updateStreamMetadata() {
        if (!this.currentStation || !this.isPlaying) {
            return;
        }

        try {
            // Try to get metadata from the stream
            const metadata = await this.fetchStreamMetadata(this.currentStation.url);
            
            if (metadata) {
                if (metadata.title) {
                    this.nowPlayingEl.textContent = metadata.title;
                }
                if (metadata.bitrate) {
                    this.streamBitrateEl.textContent = `${metadata.bitrate} kbps`;
                }
                if (metadata.listeners) {
                    this.listenerCountEl.textContent = metadata.listeners;
                }
                if (metadata.server) {
                    this.serverTypeEl.textContent = metadata.server;
                }
            } else {
                // Fallback to basic info
                this.nowPlayingEl.textContent = this.currentStation.name;
            }
            
            // Update extended metadata if section is visible
            if (this.streamInfoSection.style.display !== 'none') {
                this.updateExtendedMetadata();
            }
        } catch (error) {
            console.warn('Failed to fetch stream metadata:', error);
            this.nowPlayingEl.textContent = this.currentStation.name;
        }
    }

    async fetchStreamMetadata(streamUrl) {
        try {
            // Try to fetch metadata from common Icecast/Shoutcast stats endpoints
            const baseUrl = new URL(streamUrl);
            const possibleStatsUrls = [
                `${baseUrl.protocol}//${baseUrl.host}/stats?json=1`,
                `${baseUrl.protocol}//${baseUrl.host}/7.html`,
                `${baseUrl.protocol}//${baseUrl.host}/admin.cgi?mode=viewxml`,
                `${baseUrl.protocol}//${baseUrl.host}/status.xsl`
            ];

            for (const statsUrl of possibleStatsUrls) {
                try {
                    const response = await fetch(statsUrl, {
                        method: 'GET',
                        mode: 'cors',
                        credentials: 'omit'
                    });
                    
                    if (response.ok) {
                        const data = await response.text();
                        return this.parseStreamStats(data, statsUrl);
                    }
                } catch (e) {
                    // Silently continue to next URL
                    continue;
                }
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    parseStreamStats(data, url) {
        try {
            // Try JSON format first (Icecast2)
            if (url.includes('json') || data.trim().startsWith('{')) {
                const stats = JSON.parse(data);
                return {
                    title: stats.title || stats.songtitle || null,
                    bitrate: stats.bitrate || null,
                    listeners: stats.listeners || stats.listeners_current || null,
                    server: stats.server || 'Icecast'
                };
            }

            // Try XML format (Shoutcast)
            if (data.includes('<SONGTITLE>')) {
                const titleMatch = data.match(/<SONGTITLE>(.*?)<\/SONGTITLE>/);
                const bitrateMatch = data.match(/<BITRATE>(.*?)<\/BITRATE>/);
                const listenersMatch = data.match(/<CURRENTLISTENERS>(.*?)<\/CURRENTLISTENERS>/);
                
                return {
                    title: titleMatch ? titleMatch[1] : null,
                    bitrate: bitrateMatch ? bitrateMatch[1] : null,
                    listeners: listenersMatch ? listenersMatch[1] : null,
                    server: 'Shoutcast'
                };
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    getStationNameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            
            // Extract meaningful names from common radio hosts
            if (hostname.includes('cvtfradio')) return 'CVT Radio';
            if (hostname.includes('shoutcast')) return 'Shoutcast Stream';
            if (hostname.includes('icecast')) return 'Icecast Stream';
            if (hostname.includes('radio')) return hostname.split('.')[0].toUpperCase() + ' Radio';
            
            return hostname.replace('www.', '').split('.')[0].toUpperCase() + ' Stream';
        } catch (e) {
            return 'Custom Stream';
        }
    }

    setupToggleButtons() {
        // Initialize sections as collapsed for minimal UI
        this.searchSection.style.display = 'none';
        this.streamInfoSection.style.display = 'none';
        this.stationsSection.style.display = 'none';
        
        // Initialize toggle button states
        this.updateToggleButtonState(this.searchToggleBtn, false);
        this.updateToggleButtonState(this.streamInfoToggleBtn, false);
        this.updateToggleButtonState(this.stationsToggleBtn, false);
    }

    toggleSearchSection() {
        const isVisible = this.searchSection.style.display !== 'none';
        this.searchSection.style.display = isVisible ? 'none' : 'block';
        this.updateToggleButtonState(this.searchToggleBtn, !isVisible);
        
        // Hide welcome canvas when opening any section
        if (!isVisible) {
            this.hideWelcomeCanvas();
            this.searchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    toggleStreamInfoSection() {
        const isVisible = this.streamInfoSection.style.display !== 'none';
        this.streamInfoSection.style.display = isVisible ? 'none' : 'block';
        this.updateToggleButtonState(this.streamInfoToggleBtn, !isVisible);
        
        // Update extended metadata when opening
        if (!isVisible && this.currentStation) {
            this.updateExtendedMetadata();
        }
        
        // Hide welcome canvas when opening any section
        if (!isVisible) {
            this.hideWelcomeCanvas();
            this.streamInfoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    updateToggleButtonState(button, isActive) {
        if (isActive) {
            button.classList.remove('btn-outline-secondary');
            button.classList.add('btn-secondary');
        } else {
            button.classList.remove('btn-secondary');
            button.classList.add('btn-outline-secondary');
        }
    }

    autoCollapseSearchSection() {
        // Collapse search section after successful playback
        setTimeout(() => {
            if (this.searchSection.style.display !== 'none') {
                this.toggleSearchSection();
            }
        }, 1000); // Give user a moment to see it worked
    }

    toggleStationsSection() {
        const isVisible = this.stationsSection.style.display !== 'none';
        this.stationsSection.style.display = isVisible ? 'none' : 'block';
        this.updateToggleButtonState(this.stationsToggleBtn, !isVisible);
        
        // Load popular stations if opening for the first time
        if (!isVisible) {
            this.hideWelcomeCanvas();
            // Check if we need to load stations
            const container = document.getElementById('stations-container');
            if (container.children.length === 1 && container.children[0].classList.contains('text-center')) {
                this.loadPopularStations();
            }
            this.stationsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    hideWelcomeCanvas() {
        if (this.welcomeCanvas) {
            this.welcomeCanvas.style.display = 'none';
        }
    }

    updateExtendedMetadata() {
        if (!this.currentStation) return;

        this.extendedNowPlaying.textContent = this.nowPlayingEl.textContent;
        this.extendedBitrate.textContent = this.streamBitrateEl.textContent;
        this.extendedFormat.textContent = this.streamFormatEl.textContent;
        this.extendedServer.textContent = this.serverTypeEl.textContent;
        this.extendedListeners.textContent = this.listenerCountEl.textContent;
        this.extendedStreamUrl.textContent = this.currentStation.url;
        this.extendedStreamUrl.title = this.currentStation.url; // Full URL on hover
        
        // Copy connection status
        this.extendedConnectionStatus.innerHTML = this.connectionStatusEl.innerHTML;

        // Add sample rate if available
        this.extendedSampleRate.textContent = this.currentStation.samplerate || 'Unknown';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    /* 1.  always-open Search panel  */
    $('#search-section').show();
    $('#toggle-search').on('click', () => $('#search-section').slideToggle());
    $('#info-toggle').on('click',  () => $('#stream-info').slideToggle());

    /* 2.  auto-load default station injected by backend  */
    {% if default_station %}
       radioPlayer.loadStation( {{ default_station|tojson }} );
    {% endif %}
});


if (station.url === "https://cvtfradio.net:8090") {
    // skip rendering the delete button
}