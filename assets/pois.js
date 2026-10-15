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
		// white when outside every region. The colour is baked into the icon so it
		// survives Leaflet rebuilding markers when the overlay is toggled.
		const poiIcon = function(color) {
			const style = color ? ' style="--marker-color:' + color + '"' : '';
			return L.divIcon({
				className: 'poi-marker-icon',
				html: '<svg class="poi-marker-svg"' + style + ' viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6"/></svg>',
				iconSize: [18, 18],
				iconAnchor: [9, 18],
				popupAnchor: [0, -18],
			});
		};

		const poiMarkers = [];

		const recolorPois = function() {
			const colorAt = (typeof regionColorAt === 'function') ? regionColorAt : function() { return null; };
			poiMarkers.forEach(function(entry) {
				entry.marker.setIcon(poiIcon(poiSafeColor(colorAt(entry.x, entry.z))));
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
					poiMarkers.push({ marker, x: poi.x, z: poi.z });
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
