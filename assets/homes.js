		// BEGIN 329 HOMES
		const homeApiUrl = '__HOME_API_URL__';
		const homeLayer = L.layerGroup().addTo(map);
		overlayMaps['Homes'] = homeLayer;

		const escapeHomeHtml = function(value) {
			return String(value).replace(/[&<>'"]/g, function(character) {
				return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
			});
		};

		const homeSafeColor = function(color) {
			return (typeof color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(color)) ? color : null;
		};

		// House markers take the fill of the region their owner belongs to (by
		// gamertag membership), falling back to the theme accent when the player is
		// not a member of any region. The colour is baked into the icon so it
		// survives Leaflet rebuilding markers when the overlay is toggled.
		const homeIcon = function(color) {
			const style = color ? ' style="--marker-color:' + color + '"' : '';
			return L.divIcon({
				className: 'home-marker-icon',
				html: '<svg class="home-marker-svg"' + style + ' viewBox="0 -960 960 960" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M160-120v-480l320-240 320 240v480H560v-280H400v280H160Z"/></svg>',
				iconSize: [22, 22],
				iconAnchor: [11, 19],
				popupAnchor: [0, -19],
			});
		};

		const homeMarkers = [];

		// The tooltip element is created lazily on hover, so store the resolved
		// colour on the entry and stamp it onto the panel when it opens. This keeps
		// the hover panel outline matching the region (theme accent when outside).
		const applyHomeTooltipColor = function(entry) {
			const element = entry.marker.getTooltip() && entry.marker.getTooltip().getElement();
			if (!element) return;
			if (entry.color) element.style.setProperty('--marker-color', entry.color);
			else element.style.removeProperty('--marker-color');
		};

		const recolorHomes = function() {
			const colorForPlayer = (typeof regionColorForPlayer === 'function') ? regionColorForPlayer : function() { return null; };
			homeMarkers.forEach(function(entry) {
				entry.color = homeSafeColor(colorForPlayer(entry.gamertag));
				entry.marker.setIcon(homeIcon(entry.color));
				applyHomeTooltipColor(entry);
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
				homeMarkers.length = 0;
				homes.forEach(function(home) {
					if (!Number.isInteger(home.x) || !Number.isInteger(home.z) || typeof home.gamertag !== 'string') return;
					const marker = L.marker([-home.z, home.x], {
						icon: homeIcon(null),
					}).bindTooltip(`${escapeHomeHtml(home.gamertag)}&#39;s House`, { direction: 'top', offset: [0, -18], opacity: 1, className: 'marker-tooltip' }).addTo(homeLayer);
					const entry = { marker, gamertag: home.gamertag, color: null };
					marker.on('tooltipopen', function() { applyHomeTooltipColor(entry); });
					homeMarkers.push(entry);
				});
				recolorHomes();
			}).catch(function(error) {
				console.warn('Unable to load homes.', error);
			});
		};

		if (typeof markerColorSubscribers !== 'undefined') markerColorSubscribers.push(recolorHomes);
		loadHomes();
		setInterval(loadHomes, 60000);
		// END 329 HOMES
