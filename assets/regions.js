		// BEGIN 329 REGIONS
		const regions = [
			{
				name: 'Endless Estuary',
				bounds: [[-510, -48], [-326, 142]],
				color: '#d58c2b',
				labelClass: 'region-label-estuary',
			},
			{
				name: 'Winterhold',
				bounds: [[-416, 158], [-214, 400]],
				color: '#62aee0',
				labelClass: 'region-label-winterhold',
			},
			{
				name: 'The Lands of Sylvaria',
				bounds: [[-1500, 326], [-1048, 602]],
				color: '#4d9b57',
				labelClass: 'region-label-sylvaria',
			},
		];
		const regionLayer = L.layerGroup(regions.map(function(region) {
			return L.rectangle(region.bounds, {
				color: region.color,
				fillColor: region.color,
				fillOpacity: 0.18,
				weight: 3,
			}).bindTooltip(region.name, {
				className: `region-label ${region.labelClass}`,
				direction: 'center',
				opacity: 1,
				permanent: true,
			});
		})).addTo(map);
		overlayMaps['Regions'] = regionLayer;
		// END 329 REGIONS
