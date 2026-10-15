		// BEGIN 329 CLOUDS
		// Opaque fog-of-war clouds over unexplored terrain. Rendered terrain
		// tiles are opaque where explored and transparent/absent where not, so a
		// single cloud layer placed *below* the terrain tile pane shows through
		// only in the void — the terrain masks itself, with no per-chunk mask
		// computation. Terrain is never drawn over or modified.
		//
		// To avoid an obvious 512px repeat, one seamless texture is mapped
		// continuously across a PERIOD x PERIOD block of tiles: each tile shows a
		// 1/PERIOD slice, so the cloud field flows across tile boundaries and the
		// visible repeat period grows to PERIOD tiles. A slow uniform drift is
		// applied with a GPU transform on the whole cloud pane (see clouds.css),
		// so every tile stays perfectly in phase (no per-tile animation seams).
		const CLOUD_TILE = 512;        // must match the GridLayer tileSize below
		const CLOUD_PERIOD = 4;        // texture repeats every CLOUD_PERIOD tiles

		// Best-effort probe for hardware GPU acceleration. The cloud overlay
		// leans on a continuous compositor transform, an SVG fringe filter, and
		// pixelated upscaling; on a software renderer those make the map stutter,
		// so the clouds start off there (the visitor can still enable them from
		// the layer control). WebGL is unavailable or backed by a known software
		// rasterizer (SwiftShader/llvmpipe/etc.) precisely when the compositor is
		// also unaccelerated, which makes it a serviceable proxy. Any failure is
		// treated as "not accelerated" so the heavier default never slips onto a
		// struggling device.
		function isGpuAccelerated() {
			try {
				const canvas = document.createElement('canvas');
				const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
				if (!gl) return false;
				const dbg = gl.getExtension('WEBGL_debug_renderer_info');
				if (dbg) {
					const renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
					if (/swiftshader|llvmpipe|softpipe|software|microsoft basic render/i.test(renderer)) {
						return false;
					}
				}
				return true;
			} catch (e) {
				return false;
			}
		}

		map.createPane('cloudPane');
		const cloudPaneEl = map.getPane('cloudPane');
		cloudPaneEl.style.zIndex = 190;                      // below terrain tiles (200)
		cloudPaneEl.style.setProperty('--period-pct', (CLOUD_PERIOD * 100) + '%');
		cloudPaneEl.style.setProperty('--drift-span', (CLOUD_PERIOD * CLOUD_TILE) + 'px');

		const CloudGrid = L.GridLayer.extend({
			// Leaflet loads only the tiles covering the viewport; keepBuffer
			// merely RETAINS already-loaded tiles when panning, it never
			// pre-loads beyond the view. The pane drifts left by one whole
			// texture period via CSS transform (see below), so without tiles to
			// the right the drift scrolls past the loaded edge and the void's
			// end scrolls into view. Pad the loaded bounds on the drift side
			// (east/+x) by the drift span + 1 tile, converting that on-screen
			// distance to projected px through the current zoom scale so the
			// right edge stays covered at every zoom. The period-exact loop
			// (--drift-span) then makes the reset seamless: every resting zoom
			// snaps to an integer level where the cloud tiles render at scale 1,
			// so the on-screen period is always CLOUD_PERIOD*CLOUD_TILE.
			_getTiledPixelBounds: function(center) {
				const b = L.GridLayer.prototype._getTiledPixelBounds.call(this, center);
				const scale = this._map.getZoomScale(this._map.getZoom(), this._tileZoom);
				const pad = ((CLOUD_PERIOD + 1) * CLOUD_TILE) / scale;
				return L.bounds(b.min, b.max.add([pad, 0]));
			},
			createTile: function(coords) {
				const tile = L.DomUtil.create('div', this.options.tileClass);
				// Static per-tile slice offset: tile at grid position (cx,cy)
				// within the PERIOD block shows the matching slice of the texture.
				const cx = ((coords.x % CLOUD_PERIOD) + CLOUD_PERIOD) % CLOUD_PERIOD;
				const cy = ((coords.y % CLOUD_PERIOD) + CLOUD_PERIOD) % CLOUD_PERIOD;
				tile.style.setProperty('--cx', (-cx * CLOUD_TILE) + 'px');
				tile.style.setProperty('--cy', (-cy * CLOUD_TILE) + 'px');
				return tile;
			},
		});

		// The terrain layer uses L.CRS.Simple with negative zoom levels; a grid
		// layer left at Leaflet's default minZoom:0 stops drawing when zoomed out
		// below 0. Span the clouds across the map's full zoom range instead.
		const cloudLayer = new CloudGrid({
			pane: 'cloudPane',
			tileClass: 'cloud-tile cloud-tile-base',
			tileSize: CLOUD_TILE,
			minZoom: map.getMinZoom(),
			maxZoom: map.getMaxZoom(),
			updateWhenZooming: false,
			keepBuffer: 2,
		});
		// Default the clouds on only where the compositor is GPU-accelerated.
		// Either way the void still reads as cloud cover, because the map
		// background is the solid cloud tone (clouds.css / index.html), not
		// black — so turning clouds off degrades to a static cloudscape rather
		// than an empty black backdrop. The layer stays in the control below so
		// the choice is always reversible.
		if (isGpuAccelerated()) {
			cloudLayer.addTo(map);
		}
		overlayMaps['Clouds'] = cloudLayer;

		// Slow uniform drift driven by a GPU transform on the cloud pane (see
		// clouds.css). Translating the already-rasterized pixel blocks avoids the
		// per-frame background re-sampling that made background-position drift
		// stutter under image-rendering:pixelated — the compositor slides the
		// layer sub-pixel with no repaint. The animation loops by exactly one
		// texture period (CLOUD_PERIOD tiles = --drift-span), so the reset is
		// seamless; the CloudGrid._getTiledPixelBounds override above pre-loads
		// a period of tiles on the drift side so the edge never scrolls into
		// view. Reduced motion disables the animation in CSS.
		cloudPaneEl.classList.add('cloud-pane-drift');

		// Drive a `clouds-active` class on the Leaflet container so the
		// cloud-coloured backdrop and the edge fringe (both in clouds.css) track
		// the Clouds overlay toggle. The backdrop, painted on the container (the
		// very back layer, shown only in the void), hides the thin subpixel seams
		// between GridLayer tiles and the un-tiled edge the drift transform
		// briefly exposes — both would otherwise reveal the black map background.
		const cloudContainer = map.getContainer();
		const setCloudsActive = function(active) {
			cloudContainer.classList.toggle('clouds-active', active);
		};
		setCloudsActive(map.hasLayer(cloudLayer));
		map.on('overlayadd overlayremove', function(event) {
			if (event.layer === cloudLayer) setCloudsActive(map.hasLayer(cloudLayer));
		});

		// Pause the drift and suspend the fringe filter while Leaflet runs its
		// zoom transform, so neither fights the zoom animation.
		map.on('zoomstart', function() { cloudContainer.classList.add('clouds-zooming'); });
		map.on('zoomend', function() { cloudContainer.classList.remove('clouds-zooming'); });

		// Edge fringe: a solid-edged, translucent cloud lip over the discovered
		// edge. The filter erodes the terrain pane's own alpha inward a few
		// pixels to isolate a hard ring just inside the explored edge. Rather
		// than flooding that band with a flat tone, it *fades the terrain's own
		// alpha* across the band, so the drifting cloud GridLayer sitting behind
		// the terrain pane shows through. The revealed pixels are literally that
		// same cloud layer, so the fringe is the exact cloud texture, perfectly
		// in phase with the void drift, and continuous across the void→coast
		// boundary — with no second layer. Reading terrain alpha directly needs
		// no tile fetching and covers interior unexplored holes as well as the
		// outer coast. On pure pan Leaflet composites the cached result; it
		// recomputes only on zoom and tile load.
		//
		// ring alpha ≈ 1 in the band; feFuncA (slope -0.2, intercept 1) turns it
		// into a factor alpha of 1 − 0.2·ring, and compositing the terrain "in"
		// that factor scales the terrain's alpha down to ~80% across the band, so
		// the cloud shows through at ~20% (`slope` is the translucency dial).
		// Interior land (ring 0) keeps factor alpha 1 and is untouched.
		(function() {
			if (document.getElementById('cloud-fringe-defs')) return;
			const svgNs = 'http://www.w3.org/2000/svg';
			const svg = document.createElementNS(svgNs, 'svg');
			svg.setAttribute('id', 'cloud-fringe-defs');
			svg.setAttribute('width', '0');
			svg.setAttribute('height', '0');
			svg.setAttribute('aria-hidden', 'true');
			svg.style.position = 'absolute';
			svg.style.width = '0';
			svg.style.height = '0';
			svg.style.overflow = 'hidden';
			svg.innerHTML =
				'<defs>' +
				'<filter id="cloud-fringe" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">' +
				'<feMorphology in="SourceAlpha" operator="erode" radius="4" result="eroded"/>' +
				'<feComposite in="SourceAlpha" in2="eroded" operator="out" result="ring"/>' +
				'<feComponentTransfer in="ring" result="fadeFactor"><feFuncA type="linear" slope="-0.2" intercept="1"/></feComponentTransfer>' +
				'<feComposite in="SourceGraphic" in2="fadeFactor" operator="in"/>' +
				'</filter>' +
				'</defs>';
			document.body.appendChild(svg);
		})();
		// END 329 CLOUDS
