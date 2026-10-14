		// BEGIN 329 HOMES
		const homeApiUrl = '__HOME_API_URL__';
		const homeLayer = L.layerGroup().addTo(map);
		overlayMaps['Homes'] = homeLayer;

		const escapeHomeHtml = function(value) {
			return String(value).replace(/[&<>'"]/g, function(character) {
				return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
			});
		};

		const loadHomes = function() {
			if (!homeApiUrl) return;
			fetch(homeApiUrl).then(function(response) {
				if (!response.ok) throw new Error(`Home API returned ${response.status}`);
				return response.json();
			}).then(function(homes) {
				if (!Array.isArray(homes)) throw new Error('Home API returned invalid data');
				homeLayer.clearLayers();
				homes.forEach(function(home) {
					if (!Number.isInteger(home.x) || !Number.isInteger(home.z) || typeof home.gamertag !== 'string') return;
					L.marker([-home.z, home.x], {
						icon: L.divIcon({
							className: 'home-marker-icon',
							html: '<svg class="home-marker-svg" viewBox="0 0 16 16" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M6.5 14.5v-3.505c0-.245.25-.495.5-.495h2c.25 0 .5.25.5.5v3.5a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5"/></svg>',
							iconSize: [22, 22],
							iconAnchor: [11, 21],
							popupAnchor: [0, -20],
						}),
					}).bindTooltip(`${escapeHomeHtml(home.gamertag)}&#39;s House`, { direction: 'top', offset: [0, -18], opacity: 1, className: 'marker-tooltip' }).addTo(homeLayer);
				});
			}).catch(function(error) {
				console.warn('Unable to load homes.', error);
			});
		};

		loadHomes();
		setInterval(loadHomes, 60000);
		// END 329 HOMES
