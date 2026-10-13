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
					const avatar = typeof home.avatarUrl === 'string' && home.avatarUrl
						? `<img class="home-popup-head" src="${escapeHomeHtml(home.avatarUrl)}" alt="" width="32" height="32" onerror="this.style.display='none'">`
						: '';
					L.marker([-home.z, home.x], {
						icon: L.divIcon({
							className: 'home-marker-icon',
							html: '<span class="home-marker-roof"></span><span class="home-marker-body"></span>',
							iconSize: [22, 22],
							iconAnchor: [11, 20],
							popupAnchor: [0, -20],
						}),
					}).bindPopup(`<div class="home-popup">${avatar}<div class="home-popup-text"><strong>${escapeHomeHtml(home.gamertag)}</strong><br>X ${home.x}, Z ${home.z}</div></div>`).addTo(homeLayer);
				});
			}).catch(function(error) {
				console.warn('Unable to load homes.', error);
			});
		};

		loadHomes();
		setInterval(loadHomes, 60000);
		// END 329 HOMES
