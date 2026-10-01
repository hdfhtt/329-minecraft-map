		// BEGIN 329 REGIONS
		const regionApiUrl = '__REGION_API_URL__';
		const regionLayer = L.layerGroup().addTo(map);
		const regionInformationLayer = L.layerGroup().addTo(map);
		let regionInformationPreferred = true;
		let syncingRegionInformation = false;
		overlayMaps['Regions'] = regionLayer;
		overlayMaps['Information'] = regionInformationLayer;

		const defaultAvatar = 'https://mc-heads.net/avatar/MHF_Steve/32.png';

		let regionEntries = [];

		const createRegionLabel = function(region) {
			const label = document.createElement('div');
			label.className = 'region-label-content';
			label.addEventListener('click', function(event) {
				event.preventDefault();
				event.stopPropagation();
				map.fitBounds(region.bounds);
			});

			const name = document.createElement('div');
			name.className = 'region-label-name';
			name.textContent = region.name;
			label.append(name);

			if (!region.players) return label;

			const players = document.createElement('div');
			players.className = 'region-players';
			region.players.forEach(function(playerEntry) {
				const playerData = (typeof playerEntry === 'string') ? { gamerTag: playerEntry } : (playerEntry || {});
				const playerName = playerData.gamerTag || playerData.displayName || '';
				if (!playerName) return;
				const player = document.createElement('button');
				player.className = 'region-player';
				player.type = 'button';
				player.setAttribute('aria-label', playerName);
				player.setAttribute('aria-expanded', 'false');
				player.addEventListener('click', function(event) {
					event.preventDefault();
					event.stopPropagation();
					const isOpen = !player.classList.contains('region-player-open');
					document.querySelectorAll('.region-player-open').forEach(function(openPlayer) {
						openPlayer.classList.remove('region-player-open');
						openPlayer.setAttribute('aria-expanded', 'false');
					});
					if (isOpen) player.classList.add('region-player-open');
					player.setAttribute('aria-expanded', String(isOpen));
				});

				const head = document.createElement('img');
				head.className = 'region-player-head';
				head.alt = '';
				head.addEventListener('error', function() {
					if (head.dataset.fallback) {
						head.classList.add('region-player-head-unavailable');
						return;
					}
					head.dataset.fallback = 'true';
					head.src = defaultAvatar;
				});
				head.src = playerData.avatarUrl || defaultAvatar;

				const playerLabel = document.createElement('span');
				playerLabel.className = 'region-player-name';
				playerLabel.textContent = playerName;
				player.append(head, playerLabel);
				players.append(player);
			});
			label.append(players);
			return label;
		};

		const setRegionColor = function(element, region) {
			if (element) element.style.setProperty('--region-color', region.color);
		};

		const createRegionEntry = function(region) {
			if (!Array.isArray(region.coordinates) || region.coordinates.length < 3 || typeof region.name !== 'string' || typeof region.color !== 'string') return undefined;
			const latLngs = region.coordinates.map(function(coordinate) {
				if (!Number.isInteger(coordinate.x) || !Number.isInteger(coordinate.z)) return undefined;
				return [-coordinate.z, coordinate.x];
			});
			if (latLngs.some(function(latLng) { return !latLng; })) return undefined;

			const polygon = L.polygon(latLngs, {
				color: region.color,
				fillColor: region.color,
				fillOpacity: 0.18,
				weight: 3,
			});
			const entryRegion = {
				...region,
				bounds: polygon.getBounds(),
				players: Array.isArray(region.players) ? region.players : [],
			};
			const tooltip = L.tooltip({
				className: 'region-label',
				direction: 'center',
				opacity: 1,
				permanent: true,
				interactive: true,
			}).setContent(createRegionLabel(entryRegion)).setLatLng(polygon.getBounds().getCenter());
			return { region: entryRegion, polygon, tooltip };
		};

		const mergedTooltips = [];
		let collisionUpdateFrame;

		const clearMergedTooltips = function() {
			mergedTooltips.splice(0).forEach(function(tooltip) {
				regionInformationLayer.removeLayer(tooltip);
			});
		};

		const getLayerControlInput = function(name) {
			const labels = document.querySelectorAll('.leaflet-control-layers-overlays label');
			for (const label of labels) {
				if (label.textContent.trim() === name) return label.querySelector('.leaflet-control-layers-selector');
			}
			return undefined;
		};

		const decorateLayerControl = function() {
			const labels = document.querySelectorAll('.leaflet-control-layers-overlays label');
			labels.forEach(function(label) {
				if (label.textContent.trim() === 'Information') label.classList.add('region-information-layer-option');
			});
		};

		const syncRegionInformationControl = function() {
			decorateLayerControl();
			const input = getLayerControlInput('Information');
			const regionsVisible = map.hasLayer(regionLayer);

			if (!regionsVisible) {
				if (map.hasLayer(regionInformationLayer)) regionInformationPreferred = true;
				syncingRegionInformation = true;
				map.removeLayer(regionInformationLayer);
				syncingRegionInformation = false;
				if (input) {
					input.checked = false;
					input.disabled = true;
					input.closest('label').classList.add('region-information-layer-disabled');
				}
				clearMergedTooltips();
				return;
			}

			if (input) {
				input.disabled = false;
				input.closest('label').classList.remove('region-information-layer-disabled');
			}

			if (regionInformationPreferred && !map.hasLayer(regionInformationLayer)) {
				syncingRegionInformation = true;
				regionInformationLayer.addTo(map);
				syncingRegionInformation = false;
			}
		};

		const labelsOverlap = function(first, second) {
			return first.left < second.right && first.right > second.left &&
				first.top < second.bottom && first.bottom > second.top;
		};

		const createMergedRegionLabel = function(entries) {
			const label = document.createElement('div');
			label.className = 'region-label-group';
			entries.forEach(function(entry) {
				const section = document.createElement('div');
				section.className = 'region-label-section';
				setRegionColor(section, entry.region);
				section.append(createRegionLabel(entry.region));
				label.append(section);
			});
			return label;
		};

		const updateRegionLabels = function() {
			collisionUpdateFrame = undefined;
			clearMergedTooltips();
			if (!map.hasLayer(regionLayer) || !map.hasLayer(regionInformationLayer)) return;

			const visibleEntries = regionEntries.filter(function(entry) {
				const element = entry.tooltip.getElement();
				if (!element) return false;
				element.classList.remove('region-label-hidden');
				setRegionColor(element, entry.region);
				return map.hasLayer(entry.polygon);
			});

			const groups = visibleEntries.map(function(entry) {
				return [entry];
			});
			let merged = true;
			while (merged) {
				merged = false;
				for (let index = 0; index < groups.length && !merged; index += 1) {
					for (let candidate = index + 1; candidate < groups.length; candidate += 1) {
						const overlaps = groups[index].some(function(first) {
							const firstBounds = first.tooltip.getElement().getBoundingClientRect();
							return groups[candidate].some(function(second) {
								return labelsOverlap(firstBounds, second.tooltip.getElement().getBoundingClientRect());
							});
						});
						if (!overlaps) continue;
						groups[index].push(...groups[candidate]);
						groups.splice(candidate, 1);
						merged = true;
						break;
					}
				}
			}

			groups.filter(function(group) {
				return group.length > 1;
			}).forEach(function(group) {
				group.forEach(function(entry) {
					entry.tooltip.getElement().classList.add('region-label-hidden');
				});
				const center = group.reduce(function(total, entry) {
					return total.add(map.latLngToContainerPoint(entry.polygon.getBounds().getCenter()));
				}, L.point(0, 0)).divideBy(group.length);
				const tooltip = L.tooltip({
					className: 'region-label region-label-merged',
					direction: 'center',
					opacity: 1,
					permanent: true,
					interactive: true,
				}).setContent(createMergedRegionLabel(group)).setLatLng(map.containerPointToLatLng(center)).addTo(regionInformationLayer);
				mergedTooltips.push(tooltip);
			});
		};

		const scheduleRegionLabelUpdate = function() {
			if (collisionUpdateFrame) cancelAnimationFrame(collisionUpdateFrame);
			collisionUpdateFrame = requestAnimationFrame(updateRegionLabels);
		};

		const loadRegions = function() {
			if (!regionApiUrl) return;
			fetch(regionApiUrl).then(function(response) {
				if (!response.ok) throw new Error(`Region API returned ${response.status}`);
				return response.json();
			}).then(function(regions) {
				if (!Array.isArray(regions)) throw new Error('Region API returned invalid data');
				clearMergedTooltips();
				regionLayer.clearLayers();
				regionInformationLayer.clearLayers();
				regionEntries = regions.map(createRegionEntry).filter(Boolean);
				regionEntries.forEach(function(entry) {
					entry.polygon.addTo(regionLayer);
					entry.tooltip.addTo(regionInformationLayer);
				});
				scheduleRegionLabelUpdate();
			}).catch(function(error) {
				console.warn('Unable to load map regions.', error);
			});
		};

		loadRegions();
		setInterval(loadRegions, 60000);
		setTimeout(syncRegionInformationControl, 0);
		map.whenReady(scheduleRegionLabelUpdate);
		map.on('zoomend moveend resize overlayadd overlayremove', scheduleRegionLabelUpdate);
		map.on('overlayadd overlayremove', function(event) {
			if (event.layer === regionInformationLayer && !syncingRegionInformation) {
				regionInformationPreferred = map.hasLayer(regionInformationLayer);
			}
			syncRegionInformationControl();
		});
		// END 329 REGIONS
