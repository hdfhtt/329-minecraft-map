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
							html: '<span class="poi-marker-core"></span>',
							iconSize: [18, 18],
							iconAnchor: [9, 9],
							popupAnchor: [0, -11],
						}),
					}).bindPopup(`<strong>${escapeHtml(poi.name)}</strong><br>X ${poi.x}, Z ${poi.z}`).addTo(poiLayer);
				});
			}).catch(function(error) {
				console.warn('Unable to load map POIs.', error);
			});
		};

		loadPois();
		setInterval(loadPois, 60000);
		// END 329 POIS
