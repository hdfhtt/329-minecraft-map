		// BEGIN 329 POIS
		const poiApiUrl = '__POI_API_URL__';
		const poiLayer = L.layerGroup().addTo(map);
		overlayMaps['Points of Interest'] = poiLayer;

		// One glyph per POI type, keyed by the slug the API sends (see the API's
		// src/enums.js PoiIcon and the labels in its discord-commands.toml). The
		// type is carried by the silhouette alone: the fill stays the region
		// colour, so a marker still says which claim it sits in. Material Symbols
		// paths, same 960 viewBox as the home marker.
		const poiDefaultIcon = 'pin';
		const poiIconPaths = {
			pin: 'M536.5-503.5Q560-527 560-560t-23.5-56.5Q513-640 480-640t-56.5 23.5Q400-593 400-560t23.5 56.5Q447-480 480-480t56.5-23.5ZM480-80Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Z',
			spawn: 'M80-200v-240q0-27 11-49t29-39v-112q0-50 35-85t85-35h160q23 0 43 8.5t37 23.5q17-15 37-23.5t43-8.5h160q50 0 85 35t35 85v112q18 17 29 39t11 49v240h-80v-80H160v80H80Zm440-360h240v-80q0-17-11.5-28.5T720-680H560q-17 0-28.5 11.5T520-640v80Zm-320 0h240v-80q0-17-11.5-28.5T400-680H240q-17 0-28.5 11.5T200-640v80Z',
			base: 'M160-120v-375l-72 55-48-64 120-92v-124h80v63l240-183 440 336-48 63-72-54v375H520v-240h-80v240H160Zm0-640q0-50 35-85t85-35q17 0 28.5-11.5T320-920h80q0 50-35 85t-85 35q-17 0-28.5 11.5T240-760h-80Z',
			town: 'M120-120v-560h240v-80l120-120 120 120v240h240v400H120Zm80-80h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm240 320h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm240 480h80v-80h-80v80Zm0-160h80v-80h-80v80Z',
			farm: 'M450-80q-33 0-66.5-7.5T315-109q12-121 70-226t149-185q-110 56-190.5 148T231-162q-4-3-7.5-6.5L216-176q-47-47-71.5-105T120-402q0-68 27-130t75-110q81-81 210-105.5t362-4.5q18 239-6 364.5T684-182q-49 49-109.5 75.5T450-80Z',
			mine: 'm368-630 106-210h12l106 210H368Zm82 474L105-570h345v414Zm60 0v-414h345L510-156Zm148-474L554-840h206l105 210H658Zm-563 0 105-210h206L302-630H95Z',
			portal: 'M160-80v-720q0-33 23.5-56.5T240-880h480q33 0 56.5 23.5T800-800v720H160Zm460-340q25 0 42.5-17.5T680-480q0-25-17.5-42.5T620-540q-25 0-42.5 17.5T560-480q0 25 17.5 42.5T620-420Z',
			village: 'M80-160v-400l240-240 240 240v400H360v-200h-80v200H80Zm200-280h80v-80h-80v80Zm360 280v-433L433-800h113l174 174v466h-80Zm160 0v-499L659-800h113l108 108v532h-80Z',
			shop: 'M841-518v318q0 33-23.5 56.5T761-120H201q-33 0-56.5-23.5T121-200v-318q-23-21-35.5-54t-.5-72l42-136q8-26 28.5-43t47.5-17h556q27 0 47 16.5t29 43.5l42 136q12 39-.5 71T841-518Zm-272-42q27 0 41-18.5t11-41.5l-22-140h-78v148q0 21 14 36.5t34 15.5Zm-180 0q23 0 37.5-15.5T441-612v-148h-78l-22 140q-4 24 10.5 42t37.5 18Zm-178 0q18 0 31.5-13t16.5-33l22-154h-78l-40 134q-6 20 6.5 43t41.5 23Zm540 0q29 0 42-23t6-43l-42-134h-76l22 154q3 20 16.5 33t31.5 13Z',
			stronghold: 'M40-120v-160l80-80v-240l-80-80v-160h80v80h80v-80h80v80h80v-80h80v160l-80 80v40h240v-40l-80-80v-160h80v80h80v-80h80v80h80v-80h80v160l-80 80v240l80 80v160H560v-120q0-33-23.5-56.5T480-320q-33 0-56.5 23.5T400-240v120H40Z',
			monument: 'm312-680 47-155v-85h80v80h81v-80h80v80l48 160H312ZM80-80v-440h80v80h640v-80h80v440H520v-200h-80v200H80Zm184-440 24-80h384l24 80H264Z',
			mansion: 'M360-120v-360h320q0-33 23.5-56.5T760-560q33 0 56.5 23.5T840-480v360H640v-200h-80v200H360Zm-240 0v-520l520-200v280H280v440H120Z',
			outpost: 'M200-120v-680h360l16 80h224v400H520l-16-80H280v280h-80Z',
			temple: 'M200-280v-280h80v280h-80Zm240 0v-280h80v280h-80ZM80-120v-80h800v80H80Zm600-160v-280h80v280h-80ZM80-640v-80l400-200 400 200v80H80Z',
			fortress: 'M160-400q0-105 50-187t110-138q60-56 110-85.5l50-29.5v132q0 37 25 58.5t56 21.5q17 0 32.5-7t28.5-23l18-22q72 42 116 116.5T800-400q0 88-43 160.5T644-125q17-24 26.5-52.5T680-238q0-40-15-75.5T622-377L480-516 339-377q-29 29-44 64t-15 75q0 32 9.5 60.5T316-125q-70-42-113-114.5T160-400Zm320-4 85 83q17 17 26 38t9 45q0 49-35 83.5T480-120q-50 0-85-34.5T360-238q0-23 9-44.5t26-38.5l85-83Z',
			bastion: 'M40-120v-480h80v80h80v-320h80v80h80v-80h80v80h80v-80h80v80h80v-80h80v320h80v-80h80v480H560v-120q0-33-23.5-56.5T480-320q-33 0-56.5 23.5T400-240v120H40Zm320-360h80v-120h-80v120Zm160 0h80v-120h-80v120Z',
			'end-city': 'M120-120v-560h160v-160h400v320h160v400H520v-160h-80v160H120Zm80-80h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm160 160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm160 320h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm160 480h80v-80h-80v80Zm0-160h80v-80h-80v80Z',
			'ancient-city': 'M80-80v-80h80v-360H80v-80l400-280 400 280v80h-80v360h80v80H80Zm240-160h80v-160l80 120 80-120v160h80v-280h-80l-80 120-80-120h-80v280Z',
			'trial-chamber': 'M365-395q35-35 35-85t-35-85q-35-35-85-35t-85 35q-35 35-35 85t35 85q35 35 85 35t85-35Zm-85 155q-100 0-170-70T40-480q0-100 70-170t170-70q81 0 141.5 46T506-560h335l79 79-140 160-100-79-80 80-80-80h-14q-25 72-87 116t-139 44Z',
			railway: 'M160-340v-380q0-53 27.5-84.5t72.5-48q45-16.5 102.5-22T480-880q66 0 124.5 5.5t102 22q43.5 16.5 68.5 48t25 84.5v380q0 59-40.5 99.5T660-200l60 60v20h-80l-80-80H400l-80 80h-80v-20l60-60q-59 0-99.5-40.5T160-340Zm80-220h200v-120H240v120Zm280 0h200v-120H520v120ZM383-337q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Zm280 0q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Z',
		};

		const defaultPoiAvatar = 'https://mc-heads.net/avatar/MHF_Steve/32.png';

		// An unrecognized slug falls back to the pin, so a type added on the API
		// side never breaks the map before this viewer is re-rendered.
		const poiIconPath = function(icon) {
			return poiIconPaths[icon] || poiIconPaths[poiDefaultIcon];
		};

		const poiSafeColor = function(color) {
			return (typeof color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(color)) ? color : null;
		};

		// POI markers take the fill of the region they sit inside, falling back to
		// the theme accent when outside every region. The colour is baked into the
		// icon so it survives Leaflet rebuilding markers when the overlay is toggled.
		// Sized to match the home marker: the filled type glyphs carry more detail
		// than a plain pin, and at 18px the white rim swallowed most of them.
		const poiIcon = function(icon, color) {
			const style = color ? ' style="--marker-color:' + color + '"' : '';
			return L.divIcon({
				className: 'poi-marker-icon',
				html: '<svg class="poi-marker-svg"' + style + ' viewBox="0 -960 960 960" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="' + poiIconPath(icon) + '"/></svg>',
				iconSize: [22, 22],
				iconAnchor: [11, 21],
				popupAnchor: [0, -21],
			});
		};

		// The hover panel: type glyph and name, the coordinate (which is also how
		// the POI is addressed in Discord), then the creator's Minecraft head and
		// gamertag. A POI whose creator is no longer registered keeps its place on
		// the map and shows an unknown author.
		const createPoiPanel = function(poi) {
			const panel = document.createElement('div');
			panel.className = 'poi-panel';

			const title = document.createElement('div');
			title.className = 'poi-panel-title';

			const glyph = document.createElement('span');
			glyph.className = 'poi-panel-glyph';
			glyph.innerHTML = '<svg viewBox="0 -960 960 960" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="' + poiIconPath(poi.icon) + '"/></svg>';

			const name = document.createElement('span');
			name.className = 'poi-panel-name';
			name.textContent = poi.name;
			title.append(glyph, name);

			const coordinates = document.createElement('div');
			coordinates.className = 'poi-panel-coordinates';
			coordinates.textContent = `X ${poi.x}, Z ${poi.z}`;

			const author = document.createElement('div');
			author.className = 'poi-panel-author';

			const head = document.createElement('img');
			head.className = 'poi-panel-head';
			head.alt = '';
			head.addEventListener('error', function() {
				if (head.dataset.fallback) {
					head.classList.add('poi-panel-head-unavailable');
					return;
				}
				head.dataset.fallback = 'true';
				head.src = defaultPoiAvatar;
			});
			head.src = poi.createdByAvatarUrl || defaultPoiAvatar;

			const label = document.createElement('span');
			label.className = 'poi-panel-author-label';
			label.textContent = 'Added by';

			const gamertag = document.createElement('span');
			gamertag.className = 'poi-panel-author-name';
			gamertag.textContent = poi.createdByGamertag || 'Unknown';

			// Label first: it spans both grid columns, leaving the head and the
			// gamertag to share the row beneath it.
			author.append(label, head, gamertag);
			panel.append(title, coordinates, author);
			return panel;
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
				entry.marker.setIcon(poiIcon(entry.icon, entry.color));
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
						icon: poiIcon(poi.icon, null),
					}).bindTooltip(createPoiPanel(poi), { direction: 'top', offset: [0, -20], opacity: 1, className: 'marker-tooltip poi-tooltip' }).addTo(poiLayer);
					const entry = { marker, x: poi.x, z: poi.z, icon: poi.icon, color: null };
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
