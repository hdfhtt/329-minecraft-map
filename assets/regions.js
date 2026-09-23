		// BEGIN 329 REGIONS
		const regions = [
			{
				name: 'Endless Estuary',
				bounds: [[-510, -48], [-326, 142]],
				color: '#d58c2b',
				labelClass: 'region-label-estuary',
				players: [
					'TheDyingStar453',
					'ActuallyYoon',
					'Super Zazaaaa',
				],
			},
			{
				name: 'Winterhold',
				bounds: [[-416, 158], [-214, 400]],
				color: '#62aee0',
				labelClass: 'region-label-winterhold',
				players: ['Fitz9566'],
			},
			{
				name: 'The Lands of Sylvaria',
				bounds: [[-1500, 326], [-1048, 602]],
				color: '#4d9b57',
				labelClass: 'region-label-sylvaria',
				players: [
					'CAPIK052545',
					'YVKI2566',
					'Izzatsaubri45',
				],
			},
		];
		const defaultAvatar = 'https://mc-heads.net/avatar/MHF_Steve/32.png';
		const playerAvatars = {
			TheDyingStar453: 'https://mc-heads.net/avatar/8144751c9b5a461d2898907ee3e9f61e5367b42294d587b0555701e95896315/32.png',
			ActuallyYoon: 'https://mc-heads.net/avatar/a7364c63c3e3bcac6061788d568b5f806f9e93a3ac31399cc98db6f1e70e6383/32.png',
			'Super Zazaaaa': defaultAvatar,
			Fitz9566: defaultAvatar,
			CAPIK052545: defaultAvatar,
			YVKI2566: defaultAvatar,
			Izzatsaubri45: defaultAvatar,
		};

		const createRegionLabel = function(region) {
			const label = document.createElement('div');
			label.className = 'region-label-content';

			const name = document.createElement('div');
			name.className = 'region-label-name';
			name.textContent = region.name;
			label.append(name);

			if (!region.players) return label;

			const players = document.createElement('div');
			players.className = 'region-players';
			region.players.forEach(function(playerName) {
				const player = document.createElement('button');
				player.className = 'region-player';
				player.type = 'button';
				player.setAttribute('aria-label', playerName);
				player.setAttribute('aria-expanded', 'false');
				player.addEventListener('click', function(event) {
					event.preventDefault();
					event.stopPropagation();
					const isOpen = player.classList.toggle('region-player-open');
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
				head.src = playerAvatars[playerName] || defaultAvatar;

				const playerLabel = document.createElement('span');
				playerLabel.className = 'region-player-name';
				playerLabel.textContent = playerName;
				player.append(head, playerLabel);
				players.append(player);
			});
			label.append(players);
			return label;
		};

		const regionEntries = regions.map(function(region) {
			const rectangle = L.rectangle(region.bounds, {
				color: region.color,
				fillColor: region.color,
				fillOpacity: 0.18,
				weight: 3,
			});
			rectangle.bindTooltip(createRegionLabel(region), {
				className: `region-label ${region.labelClass}`,
				direction: 'center',
				opacity: 1,
				permanent: true,
			});
			return { region, rectangle, tooltip: rectangle.getTooltip() };
		});

		const regionLayer = L.layerGroup(regionEntries.map(function(entry) {
			return entry.rectangle;
		})).addTo(map);
		overlayMaps['Regions'] = regionLayer;

		const mergedTooltips = [];
		let collisionUpdateFrame;

		const labelsOverlap = function(first, second) {
			return first.left < second.right && first.right > second.left &&
				first.top < second.bottom && first.bottom > second.top;
		};

		const createMergedRegionLabel = function(entries) {
			const label = document.createElement('div');
			label.className = 'region-label-group';
			entries.forEach(function(entry) {
				const section = document.createElement('div');
				section.className = `region-label-section ${entry.region.labelClass}`;
				section.append(createRegionLabel(entry.region));
				label.append(section);
			});
			return label;
		};

		const updateRegionLabels = function() {
			collisionUpdateFrame = undefined;
			mergedTooltips.splice(0).forEach(function(tooltip) {
				map.removeLayer(tooltip);
			});

			const visibleEntries = regionEntries.filter(function(entry) {
				const element = entry.tooltip.getElement();
				if (!element) return false;
				element.classList.remove('region-label-hidden');
				return map.hasLayer(entry.rectangle);
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
					return total.add(map.latLngToContainerPoint(entry.rectangle.getBounds().getCenter()));
				}, L.point(0, 0)).divideBy(group.length);
				const tooltip = L.tooltip({
					className: 'region-label region-label-merged',
					direction: 'center',
					opacity: 1,
					permanent: true,
					interactive: true,
				}).setContent(createMergedRegionLabel(group)).setLatLng(map.containerPointToLatLng(center)).addTo(map);
				mergedTooltips.push(tooltip);
			});
		};

		const scheduleRegionLabelUpdate = function() {
			if (collisionUpdateFrame) cancelAnimationFrame(collisionUpdateFrame);
			collisionUpdateFrame = requestAnimationFrame(updateRegionLabels);
		};

		map.whenReady(scheduleRegionLabelUpdate);
		map.on('zoomend moveend resize overlayadd overlayremove', scheduleRegionLabelUpdate);
		// END 329 REGIONS
