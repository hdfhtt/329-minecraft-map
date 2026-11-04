		// BEGIN 329 LOADING
		// Cold-load feedback, split by who is allowed to make the visitor wait.
		//
		// The splash (markup in index.html, styles in loading.css) covers the
		// stretch where Leaflet has painted nothing: script download,
		// data/info.json, and the first screenful of terrain tiles. It reports
		// real tile progress and is dismissed when the terrain layer fires
		// `load`, which is when every tile covering the viewport has settled.
		//
		// The overlays are deliberately not part of that. They come from the
		// API, where a cold Azure Function can take seconds, and gating the map
		// on them would make the whole portal feel as slow as its slowest
		// request. They report into a small bottom-left pill instead, over a map
		// that is already interactive. Only each overlay's first load is
		// announced — a pill blinking through every 60s refresh is just noise.
		const mapLoading = (function() {
			const splash = document.getElementById('map-loading');
			const fill = splash && splash.querySelector('.map-loading-fill');
			const count = splash && splash.querySelector('.map-loading-count');

			// Dismiss the splash after this long with no tile event at all. A
			// stalled request or a visitor who went offline must never stay
			// trapped behind it, while steady progress keeps it up for as long
			// as the tiles keep arriving.
			const STALL_TIMEOUT = 8000;

			let requested = 0;
			let settled = 0;
			let dismissed = false;
			let stallTimer;
			let terrain;

			const dismiss = function() {
				if (dismissed) return;
				dismissed = true;
				clearTimeout(stallTimer);
				if (!splash) return;
				splash.classList.add('map-loading-done');
				// Drop it from the DOM once faded. The timeout covers the cases
				// where no transition runs (reduced motion, hidden tab).
				splash.addEventListener('transitionend', function() { splash.remove(); }, { once: true });
				setTimeout(function() { splash.remove(); }, 1000);
			};

			const armStallTimer = function() {
				clearTimeout(stallTimer);
				stallTimer = setTimeout(dismiss, STALL_TIMEOUT);
			};

			const renderProgress = function() {
				if (dismissed || !splash || !requested) return;
				splash.classList.remove('map-loading-indeterminate');
				fill.style.width = Math.round((settled / requested) * 100) + '%';
				count.textContent = settled + ' / ' + requested + ' tiles';
			};

			// MinedMap builds its terrain layer long after this block runs, so
			// catch the layer as it is added rather than reaching for it. The
			// cloud overlay is a plain GridLayer and every terrain layer is a
			// TileLayer, so the first TileLayer to land is the terrain; the
			// Illumination and Topography layers that may follow are ignored.
			map.on('layeradd', function(event) {
				if (terrain || !(event.layer instanceof L.TileLayer)) return;
				terrain = event.layer;
				terrain.on('tileloadstart', function() {
					requested += 1;
					armStallTimer();
					renderProgress();
				});
				terrain.on('tileload tileerror', function() {
					settled += 1;
					armStallTimer();
					renderProgress();
				});
				terrain.on('load', dismiss);
			});

			const pending = new Set();
			const announced = new Set();
			const statusControl = L.control({ position: 'bottomleft' });
			let statusLabel;

			statusControl.onAdd = function() {
				const container = L.DomUtil.create('div', 'leaflet-control map-data-status map-data-status-hidden');
				container.setAttribute('role', 'status');
				container.setAttribute('aria-live', 'polite');
				L.DomUtil.create('span', 'map-data-spinner', container).setAttribute('aria-hidden', 'true');
				statusLabel = L.DomUtil.create('span', 'map-data-label', container);
				return container;
			};
			statusControl.addTo(map);

			const renderStatus = function() {
				const container = statusControl.getContainer();
				if (!container) return;
				const names = Array.from(pending);
				container.classList.toggle('map-data-status-hidden', !names.length);
				if (!names.length) return;
				statusLabel.textContent = (names.length === 1) ? 'Loading ' + names[0] + '\u2026' : 'Loading map data\u2026';
			};

			armStallTimer();

			return {
				begin: function(name) {
					if (announced.has(name)) return;
					pending.add(name);
					renderStatus();
				},
				end: function(name) {
					announced.add(name);
					pending.delete(name);
					renderStatus();
				},
			};
		})();
		// END 329 LOADING
