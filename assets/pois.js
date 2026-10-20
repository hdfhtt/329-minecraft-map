		// BEGIN 329 POIS
		const poiApiUrl = '__POI_API_URL__';
		const poiLayer = L.layerGroup().addTo(map);
		overlayMaps['Points of Interest'] = poiLayer;

		const escapeHtml = function(value) {
			return String(value).replace(/[&<>'"]/g, function(character) {
				return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
			});
		};

		const poiSafeColor = function(color) {
			return (typeof color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(color)) ? color : null;
		};

		// POI markers take the fill of the region they sit inside, falling back to
		// the theme accent when outside every region. The colour is baked into the
		// icon so it survives Leaflet rebuilding markers when the overlay is toggled.
		const poiIcon = function(color) {
			const style = color ? ' style="--marker-color:' + color + '"' : '';
			return L.divIcon({
				className: 'poi-marker-icon',
				html: '<svg class="poi-marker-svg"' + style + ' viewBox="0 -960 960 960" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M480-480q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0 400Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Z"/></svg>',
				iconSize: [18, 18],
				iconAnchor: [9, 17],
				popupAnchor: [0, -17],
			});
		};

		const poiMarkers = [];

		// The tooltip element is created lazily on hover, so store the resolved
		// colour on the entry and stamp it onto the panel when it opens. This keeps
		// the hover panel outline matching the region (theme accent when outside).
		const applyPoiTooltipColor = function(entry) {
			const element = entry.marker.getTooltip() && entry.marker.getTooltip().getElement();
			if (!element) return;
			if (entry.color) element.style.setProperty('--marker-color', entry.color);
			else element.style.removeProperty('--marker-color');
		};

		const recolorPois = function() {
			const colorAt = (typeof regionColorAt === 'function') ? regionColorAt : function() { return null; };
			poiMarkers.forEach(function(entry) {
				entry.color = poiSafeColor(colorAt(entry.x, entry.z));
				entry.marker.setIcon(poiIcon(entry.color));
				applyPoiTooltipColor(entry);
			});
		};

		const loadPois = function() {
			if (!poiApiUrl) return;
			fetch(poiApiUrl).then(function(response) {
				if (!response.ok) throw new Error(`POI API returned ${response.status}`);
				return response.json();
			}).then(function(pois) {
				if (!Array.isArray(pois)) throw new Error('POI API returned invalid data');
				poiLayer.clearLayers();
				poiMarkers.length = 0;
				pois.forEach(function(poi) {
					if (!Number.isInteger(poi.x) || !Number.isInteger(poi.z) || typeof poi.name !== 'string') return;
					const marker = L.marker([-poi.z, poi.x], {
						icon: poiIcon(null),
					}).bindTooltip(escapeHtml(poi.name), { direction: 'top', offset: [0, -16], opacity: 1, className: 'marker-tooltip' }).addTo(poiLayer);
					const entry = { marker, x: poi.x, z: poi.z, color: null };
					marker.on('tooltipopen', function() { applyPoiTooltipColor(entry); });
					poiMarkers.push(entry);
				});
				recolorPois();
			}).catch(function(error) {
				console.warn('Unable to load map POIs.', error);
			});
		};

		if (typeof markerColorSubscribers !== 'undefined') markerColorSubscribers.push(recolorPois);
		loadPois();
		setInterval(loadPois, 60000);
		// END 329 POIS
