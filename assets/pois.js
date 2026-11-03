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
			pin: 'M536.5-503.5Q560-527 560-560t-23.5-56.5Q513-640 480-640t-56.5 23.5Q400-593 400-560t23.5 56.5Q447-480 480-480t56.5-23.5ZM480-186q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z',
			spawn: 'M80-200v-240q0-27 11-49t29-39v-112q0-50 35-85t85-35h160q23 0 43 8.5t37 23.5q17-15 37-23.5t43-8.5h160q50 0 85 35t35 85v112q18 17 29 39t11 49v240h-80v-80H160v80H80Zm440-360h240v-80q0-17-11.5-28.5T720-680H560q-17 0-28.5 11.5T520-640v80Zm-320 0h240v-80q0-17-11.5-28.5T400-680H240q-17 0-28.5 11.5T200-640v80Zm-40 200h640v-80q0-17-11.5-28.5T760-480H200q-17 0-28.5 11.5T160-440v80Zm640 0H160h640Z',
			base: 'M160-120v-375l-72 55-48-64 120-92v-124h80v63l240-183 440 336-48 63-72-54v375H160Zm80-80h200v-160h80v160h200v-356L480-739 240-556v356Zm-80-560q0-50 35-85t85-35q17 0 28.5-11.5T320-920h80q0 50-35 85t-85 35q-17 0-28.5 11.5T240-760h-80Zm80 560h480-480Z',
			town: 'M120-120v-560h240v-80l120-120 120 120v240h240v400H120Zm80-80h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm240 320h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm240 480h80v-80h-80v80Zm0-160h80v-80h-80v80Z',
			farm: 'M80-160v-80h230q-22-85-83.5-146.5T80-470q20-5 39.5-7.5T160-480q134 0 227 93t93 227H80Zm480 0q0-42-9-83.5T525-323q42-71 114.5-114T800-480q21 0 40.5 2.5T880-470q-85 22-146 83.5T650-240h230v80H560Zm-80-239q0-65 24-122t66-100.5q42-43.5 98.5-69.5T789-719q-56 35-98 86t-65 114q-44 21-80.5 51.5T480-399Zm-73-75q-12-9-24-17t-25-16q0-6 1-12.5t1-12.5q0-76-24-144t-68-124q66 27 114.5 77.5T457-606q-18 30-31 63.5T407-474Z',
			mine: 'M480-120 80-600l120-240h560l120 240-400 480Zm-95-520h190l-60-120h-70l-60 120Zm55 347v-267H218l222 267Zm80 0 222-267H520v267Zm144-347h106l-60-120H604l60 120Zm-474 0h106l60-120H250l-60 120Z',
			portal: 'M160-80v-720q0-33 23.5-56.5T240-880h480q33 0 56.5 23.5T800-800v720H160Zm80-80h480v-640H240v640Zm380-260q25 0 42.5-17.5T680-480q0-25-17.5-42.5T620-540q-25 0-42.5 17.5T560-480q0 25 17.5 42.5T620-420ZM240-160v-640 640Z',
			village: 'M80-160v-400l240-240 240 240v400H80Zm80-80h120v-120h80v120h120v-287L320-687 160-527v287Zm120-200v-80h80v80h-80Zm360 280v-433L433-800h113l174 174v466h-80Zm160 0v-499L659-800h113l108 108v532h-80Zm-640-80h320-320Z',
			shop: 'M841-518v318q0 33-23.5 56.5T761-120H201q-33 0-56.5-23.5T121-200v-318q-23-21-35.5-54t-.5-72l42-136q8-26 28.5-43t47.5-17h556q27 0 47 16.5t29 43.5l42 136q12 39-.5 71T841-518Zm-272-42q27 0 41-18.5t11-41.5l-22-140h-78v148q0 21 14 36.5t34 15.5Zm-180 0q23 0 37.5-15.5T441-612v-148h-78l-22 140q-4 24 10.5 42t37.5 18Zm-178 0q18 0 31.5-13t16.5-33l22-154h-78l-40 134q-6 20 6.5 43t41.5 23Zm540 0q29 0 42-23t6-43l-42-134h-76l22 154q3 20 16.5 33t31.5 13ZM201-200h560v-282q-5 2-6.5 2H751q-27 0-47.5-9T663-518q-18 18-41 28t-49 10q-27 0-50.5-10T481-518q-17 18-39.5 28T393-480q-29 0-52.5-10T299-518q-21 21-41.5 29.5T211-480h-4.5q-2.5 0-5.5-2v282Zm560 0H201h560Z',
			stronghold: 'M40-120v-160l80-80v-240l-80-80v-160h80v80h80v-80h80v80h80v-80h80v160l-80 80v40h240v-40l-80-80v-160h80v80h80v-80h80v80h80v-80h80v160l-80 80v240l80 80v160H560v-120q0-33-23.5-56.5T480-320q-33 0-56.5 23.5T400-240v120H40Zm80-80h200v-40q0-66 47-113t113-47q66 0 113 47t47 113v40h200v-47l-80-80v-306l47-47H633l47 47v153H280v-153l47-47H153l47 47v306l-80 80v47Zm360-240Z',
			monument: 'M80-80v-440h80v80h80l119-395v-85h80v80h81v-80h80v80l120 400h80v-80h80v440H520v-200h-80v200H80Zm268-440h264l-24-80H372l-24 80Zm48-160h168l-24-80H420l-24 80ZM160-160h200v-200h240v200h200v-200H660l-24-80H324l-24 80H160v200Zm320-300Z',
			mansion: 'M120-120v-520l520-200v360h40q0-33 23.5-56.5T760-560q33 0 56.5 23.5T840-480v360H120Zm80-80h160v-280h200v-244L200-585v385Zm240 0h120v-120h80v120h120v-200H440v200ZM280-560Zm320 360Zm0-20Z',
			outpost: 'M200-120v-680h360l16 80h224v400H520l-16-80H280v280h-80Zm300-440Zm86 160h134v-240H510l-16-80H280v240h290l16 80Z',
			temple: 'M200-280v-280h80v280h-80Zm240 0v-280h80v280h-80ZM80-120v-80h800v80H80Zm600-160v-280h80v280h-80ZM80-640v-80l400-200 400 200v80H80Zm178-80h444-444Zm0 0h444L480-830 258-720Z',
			fortress: 'M240-400q0 52 21 98.5t60 81.5q-1-5-1-9v-9q0-32 12-60t35-51l113-111 113 111q23 23 35 51t12 60v9q0 4-1 9 39-35 60-81.5t21-98.5q0-50-18.5-94.5T648-574q-20 13-42 19.5t-45 6.5q-62 0-107.5-41T401-690q-39 33-69 68.5t-50.5 72Q261-513 250.5-475T240-400Zm240 52-57 56q-11 11-17 25t-6 29q0 32 23.5 55t56.5 23q33 0 56.5-23t23.5-55q0-16-6-29.5T537-292l-57-56Zm0-492v132q0 34 23.5 57t57.5 23q18 0 33.5-7.5T622-658l18-22q74 42 117 117t43 163q0 134-93 227T480-80q-134 0-227-93t-93-227q0-129 86.5-245T480-840Z',
			bastion: 'M40-120v-480h80v80h80v-320h80v80h80v-80h80v80h80v-80h80v80h80v-80h80v320h80v-80h80v480H560v-120q0-33-23.5-56.5T480-320q-33 0-56.5 23.5T400-240v120H40Zm80-80h200v-40q0-66 47-113t113-47q66 0 113 47t47 113v40h200v-240H680v-240H280v240H120v240Zm240-280h80v-120h-80v120Zm160 0h80v-120h-80v120Zm-40 40Z',
			'end-city': 'M120-120v-560h160v-160h400v320h160v400H520v-160h-80v160H120Zm80-80h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm160 160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm160 320h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm160 480h80v-80h-80v80Zm0-160h80v-80h-80v80Z',
			'ancient-city': 'M80-80v-80h80v-360H80v-80l400-280 400 280v80h-80v360h80v80H80Zm160-80h480-480Zm80-80h80v-160l80 120 80-120v160h80v-280h-80l-80 120-80-120h-80v280Zm400 80v-454L480-782 240-614v454h480Z',
			'trial-chamber': 'M223.5-423.5Q200-447 200-480t23.5-56.5Q247-560 280-560t56.5 23.5Q360-513 360-480t-23.5 56.5Q313-400 280-400t-56.5-23.5ZM280-240q-100 0-170-70T40-480q0-100 70-170t170-70q67 0 121.5 33t86.5 87h352l120 120-180 180-80-60-80 60-85-60h-47q-32 54-86.5 87T280-240Zm0-80q56 0 98.5-34t56.5-86h125l58 41 82-61 71 55 75-75-40-40H435q-14-52-56.5-86T280-640q-66 0-113 47t-47 113q0 66 47 113t113 47Z',
			railway: 'M160-340v-380q0-53 27.5-84.5t72.5-48q45-16.5 102.5-22T480-880q66 0 124.5 5.5t102 22q43.5 16.5 68.5 48t25 84.5v380q0 59-40.5 99.5T660-200l60 60v20h-80l-80-80H400l-80 80h-80v-20l60-60q-59 0-99.5-40.5T160-340Zm320-460q-106 0-155 12.5T258-760h448q-15-17-64.5-28.5T480-800ZM240-560h200v-120H240v120Zm420 80H240h480-60Zm-140-80h200v-120H520v120ZM383-337q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Zm280 0q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Zm-363 57h360q26 0 43-17t17-43v-140H240v140q0 26 17 43t43 17Zm180-480h226-448 222Z',
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
		const poiIcon = function(icon, color) {
			const style = color ? ' style="--marker-color:' + color + '"' : '';
			return L.divIcon({
				className: 'poi-marker-icon',
				html: '<svg class="poi-marker-svg"' + style + ' viewBox="0 -960 960 960" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="' + poiIconPath(icon) + '"/></svg>',
				iconSize: [18, 18],
				iconAnchor: [9, 17],
				popupAnchor: [0, -17],
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

			author.append(head, label, gamertag);
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
					}).bindTooltip(createPoiPanel(poi), { direction: 'top', offset: [0, -16], opacity: 1, className: 'marker-tooltip poi-tooltip' }).addTo(poiLayer);
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
