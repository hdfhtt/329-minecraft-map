		// BEGIN 329 GUILDS
		const guildApiUrl = '__GUILD_API_URL__';
		const guildLayer = L.layerGroup().addTo(map);
		const guildInformationLayer = L.layerGroup().addTo(map);
		let guildInformationPreferred = true;
		let syncingGuildInformation = false;
		overlayMaps['Guilds'] = guildLayer;
		overlayMaps['Information'] = guildInformationLayer;

		const defaultAvatar = 'https://mc-heads.net/avatar/MHF_Steve/32.png';

		let guildEntries = [];

		const createGuildLabel = function(guild) {
			const label = document.createElement('div');
			label.className = 'region-label-content';
			label.addEventListener('click', function(event) {
				event.preventDefault();
				event.stopPropagation();
				map.fitBounds(guild.bounds);
			});

			const name = document.createElement('div');
			name.className = 'region-label-name';
			name.textContent = guild.name;
			label.append(name);

			if (!guild.players) return label;

			const players = document.createElement('div');
			players.className = 'region-players';
			guild.players.forEach(function(playerEntry) {
				const playerData = (typeof playerEntry === 'string') ? { xboxGamertag: playerEntry } : (playerEntry || {});
				const playerName = playerData.xboxGamertag || playerData.discordUsername || '';
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

		const setGuildColor = function(element, guild) {
			if (element) element.style.setProperty('--region-color', guild.color);
		};

		const createGuildEntry = function(guild) {
			if (!Array.isArray(guild.coordinates) || guild.coordinates.length < 3 || typeof guild.name !== 'string' || typeof guild.color !== 'string') return undefined;
			const latLngs = guild.coordinates.map(function(coordinate) {
				if (!Number.isInteger(coordinate.x) || !Number.isInteger(coordinate.z)) return undefined;
				return [-coordinate.z, coordinate.x];
			});
			if (latLngs.some(function(latLng) { return !latLng; })) return undefined;

			const polygon = L.polygon(latLngs, {
				color: guild.color,
				fillColor: guild.color,
				fillOpacity: 0.18,
				weight: 3,
			});
			const entryGuild = {
				...guild,
				bounds: polygon.getBounds(),
				players: Array.isArray(guild.players) ? guild.players : [],
			};
			const tooltip = L.tooltip({
				className: 'region-label',
				direction: 'center',
				opacity: 1,
				permanent: true,
				interactive: true,
			}).setContent(createGuildLabel(entryGuild)).setLatLng(polygon.getBounds().getCenter());
			return { guild: entryGuild, polygon, tooltip };
		};

		const mergedTooltips = [];
		let collisionUpdateFrame;

		const clearMergedTooltips = function() {
			mergedTooltips.splice(0).forEach(function(tooltip) {
				guildInformationLayer.removeLayer(tooltip);
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

		const syncGuildInformationControl = function() {
			decorateLayerControl();
			const input = getLayerControlInput('Information');
			const guildsVisible = map.hasLayer(guildLayer);

			if (!guildsVisible) {
				if (map.hasLayer(guildInformationLayer)) guildInformationPreferred = true;
				syncingGuildInformation = true;
				map.removeLayer(guildInformationLayer);
				syncingGuildInformation = false;
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

			if (guildInformationPreferred && !map.hasLayer(guildInformationLayer)) {
				syncingGuildInformation = true;
				guildInformationLayer.addTo(map);
				syncingGuildInformation = false;
			}
		};

		const labelsOverlap = function(first, second) {
			return first.left < second.right && first.right > second.left &&
				first.top < second.bottom && first.bottom > second.top;
		};

		const createMergedGuildLabel = function(entries) {
			const label = document.createElement('div');
			label.className = 'region-label-group';
			entries.forEach(function(entry) {
				const section = document.createElement('div');
				section.className = 'region-label-section';
				setGuildColor(section, entry.guild);
				section.append(createGuildLabel(entry.guild));
				label.append(section);
			});
			return label;
		};

		const updateGuildLabels = function() {
			collisionUpdateFrame = undefined;
			clearMergedTooltips();
			if (!map.hasLayer(guildLayer) || !map.hasLayer(guildInformationLayer)) return;

			const visibleEntries = guildEntries.filter(function(entry) {
				const element = entry.tooltip.getElement();
				if (!element) return false;
				element.classList.remove('region-label-hidden');
				setGuildColor(element, entry.guild);
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
				}).setContent(createMergedGuildLabel(group)).setLatLng(map.containerPointToLatLng(center)).addTo(guildInformationLayer);
				mergedTooltips.push(tooltip);
			});
		};

		const scheduleGuildLabelUpdate = function() {
			if (collisionUpdateFrame) cancelAnimationFrame(collisionUpdateFrame);
			collisionUpdateFrame = requestAnimationFrame(updateGuildLabels);
		};

		const markerColorSubscribers = [];

		const pointInGuild = function(x, z, coordinates) {
			let inside = false;
			for (let index = 0, previous = coordinates.length - 1; index < coordinates.length; previous = index++) {
				const xi = coordinates[index].x, zi = coordinates[index].z;
				const xj = coordinates[previous].x, zj = coordinates[previous].z;
				if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) inside = !inside;
			}
			return inside;
		};

		const guildColorAt = function(x, z) {
			for (const entry of guildEntries) {
				const coordinates = entry.guild.coordinates;
				if (Array.isArray(coordinates) && pointInGuild(x, z, coordinates)) return entry.guild.color;
			}
			return null;
		};

		const guildColorForPlayer = function(gamertag) {
			if (typeof gamertag !== 'string' || !gamertag) return null;
			for (const entry of guildEntries) {
				const players = entry.guild.players || [];
				const match = players.some(function(playerEntry) {
					const playerData = (typeof playerEntry === 'string') ? { xboxGamertag: playerEntry } : (playerEntry || {});
					const playerName = playerData.xboxGamertag || playerData.discordUsername || '';
					return playerName === gamertag;
				});
				if (match) return entry.guild.color;
			}
			return null;
		};

		const loadGuilds = function() {
			if (!guildApiUrl) return;
			if (typeof mapLoading !== 'undefined') mapLoading.begin('Guilds');
			fetch(guildApiUrl).then(function(response) {
				if (!response.ok) throw new Error(`Guild API returned ${response.status}`);
				return response.json();
			}).then(function(guilds) {
				if (!Array.isArray(guilds)) throw new Error('Guild API returned invalid data');
				clearMergedTooltips();
				guildLayer.clearLayers();
				guildInformationLayer.clearLayers();
				guildEntries = guilds.map(createGuildEntry).filter(Boolean);
				guildEntries.forEach(function(entry) {
					entry.polygon.addTo(guildLayer);
					entry.tooltip.addTo(guildInformationLayer);
				});
				scheduleGuildLabelUpdate();
				markerColorSubscribers.forEach(function(subscriber) { subscriber(); });
			}).catch(function(error) {
				console.warn('Unable to load map guilds.', error);
			}).finally(function() {
				if (typeof mapLoading !== 'undefined') mapLoading.end('Guilds');
			});
		};

		loadGuilds();
		setInterval(loadGuilds, 60000);
		setTimeout(syncGuildInformationControl, 0);
		map.whenReady(scheduleGuildLabelUpdate);
		map.on('zoomend moveend resize overlayadd overlayremove', scheduleGuildLabelUpdate);
		map.on('overlayadd overlayremove', function(event) {
			if (event.layer === guildInformationLayer && !syncingGuildInformation) {
				guildInformationPreferred = map.hasLayer(guildInformationLayer);
			}
			syncGuildInformationControl();
		});
		// END 329 GUILDS
