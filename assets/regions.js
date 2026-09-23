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

		const regionLayer = L.layerGroup(regions.map(function(region) {
			return L.rectangle(region.bounds, {
				color: region.color,
				fillColor: region.color,
				fillOpacity: 0.18,
				weight: 3,
			}).bindTooltip(createRegionLabel(region), {
				className: `region-label ${region.labelClass}`,
				direction: 'center',
				opacity: 1,
				permanent: true,
			});
		})).addTo(map);
		overlayMaps['Regions'] = regionLayer;
		// END 329 REGIONS
