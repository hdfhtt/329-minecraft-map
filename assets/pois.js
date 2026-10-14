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
							html: '<svg class="poi-marker-svg" viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6"/></svg>',
							iconSize: [18, 18],
							iconAnchor: [9, 18],
							popupAnchor: [0, -18],
						}),
					}).bindTooltip(escapeHtml(poi.name), { direction: 'top', offset: [0, -16], opacity: 1, className: 'marker-tooltip' }).addTo(poiLayer);
				});
			}).catch(function(error) {
				console.warn('Unable to load map POIs.', error);
			});
		};

		loadPois();
		setInterval(loadPois, 60000);
		// END 329 POIS
