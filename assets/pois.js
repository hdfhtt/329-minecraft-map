		// BEGIN 329 POIS
		const poiApiUrl = '__POI_API_URL__';
		const poiLayer = L.layerGroup().addTo(map);
		overlayMaps['Points of Interest'] = poiLayer;

		const escapeHtml = function(value) {
			return String(value).replace(/[&<>'"]/g, function(character) {
				return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
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
				pois.forEach(function(poi) {
					if (!Number.isInteger(poi.x) || !Number.isInteger(poi.z) || typeof poi.name !== 'string') return;
					L.marker([-poi.z, poi.x], {
						icon: L.divIcon({
							className: 'poi-marker-icon',
							html: '<svg class="poi-marker-svg" viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 0.5 15.5 8 8 15.5 0.5 8Z"/><path d="M8 3 13 8 8 13 3 8Z" fill="none" stroke="rgba(255,253,242,0.42)" stroke-width="1"/></svg>',
							iconSize: [18, 18],
							iconAnchor: [9, 9],
							popupAnchor: [0, -11],
						}),
					}).bindPopup(`<strong>${escapeHtml(poi.name)}</strong><br>X ${poi.x}, Z ${poi.z}`).bindTooltip(escapeHtml(poi.name), { direction: 'top', offset: [0, -8], opacity: 1, className: 'marker-tooltip' }).addTo(poiLayer);
				});
			}).catch(function(error) {
				console.warn('Unable to load map POIs.', error);
			});
		};

		loadPois();
		setInterval(loadPois, 60000);
		// END 329 POIS
