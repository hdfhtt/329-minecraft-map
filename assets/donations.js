		// BEGIN 329 DONATIONS
		const donationApiUrl = '__DONATION_API_URL__';

		const formatDonationAmount = function(amount) {
			return `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
		};

		const formatDonationDate = function(value) {
			const date = new Date(`${value}T00:00:00+08:00`);
			if (Number.isNaN(date.getTime())) return value;
			return new Intl.DateTimeFormat('en-MY', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' }).format(date);
		};

		const createDonationList = function(items, type) {
			const list = document.createElement('ol');
			list.className = 'donation-list';
			if (items.length === 0) {
				const empty = document.createElement('li');
				empty.className = 'donation-empty';
				empty.textContent = 'No donations recorded yet.';
				list.append(empty);
				return list;
			}

			items.forEach(function(donation, index) {
				const row = document.createElement('li');
				row.className = 'donation-row';

				const name = document.createElement('div');
				name.className = 'donation-name';
				name.textContent = type === 'top' ? `#${index + 1} ${donation.name}` : donation.name;

				const amount = document.createElement('div');
				amount.className = 'donation-amount';
				amount.textContent = formatDonationAmount(donation.amount);

				row.append(name, amount);

				if (type === 'month') {
					const meta = document.createElement('div');
					meta.className = 'donation-meta';
					meta.textContent = `${formatDonationDate(donation.date)} - Ref ${donation.refNo}`;
					row.append(meta);
				}

				list.append(row);
			});
			return list;
		};

		if (donationApiUrl) {
			const overlay = document.createElement('div');
			overlay.className = 'donation-overlay';
			overlay.hidden = true;

			const panel = document.createElement('section');
			panel.className = 'donation-control';
			panel.setAttribute('role', 'dialog');
			panel.setAttribute('aria-modal', 'true');
			panel.setAttribute('aria-label', 'Donations');
			L.DomEvent.disableClickPropagation(panel);
			L.DomEvent.disableScrollPropagation(panel);

			const header = document.createElement('div');
			header.className = 'donation-header';

			const title = document.createElement('h2');
			title.className = 'donation-title';
			title.textContent = 'Donations';

			const closeButton = document.createElement('button');
			closeButton.className = 'donation-close';
			closeButton.type = 'button';
			closeButton.setAttribute('aria-label', 'Close donations');
			closeButton.textContent = '\u00d7';

			header.append(title, closeButton);

			const tabs = document.createElement('div');
			tabs.className = 'donation-tabs';
			tabs.setAttribute('role', 'tablist');

			const monthButton = document.createElement('button');
			monthButton.className = 'donation-tab donation-tab-active';
			monthButton.type = 'button';
			monthButton.setAttribute('role', 'tab');
			monthButton.setAttribute('aria-selected', 'true');
			monthButton.textContent = 'This Month';

			const topButton = document.createElement('button');
			topButton.className = 'donation-tab';
			topButton.type = 'button';
			topButton.setAttribute('role', 'tab');
			topButton.setAttribute('aria-selected', 'false');
			topButton.textContent = 'Top Donators';

			const content = document.createElement('div');
			content.className = 'donation-content';
			content.textContent = 'Loading donations...';

			const disclaimer = document.createElement('p');
			disclaimer.className = 'donation-disclaimer';
			disclaimer.textContent = 'Every donation goes entirely toward running Minecraft with 329 and its related projects, including the Discord bot and this map portal. None of it is used for personal purposes.';

			tabs.append(monthButton, topButton);
			panel.append(header, tabs, content, disclaimer);
			overlay.append(panel);

			let donations = { thisMonth: [], topDonators: [] };
			let activeTab = 'month';

			const render = function() {
				monthButton.classList.toggle('donation-tab-active', activeTab === 'month');
				topButton.classList.toggle('donation-tab-active', activeTab === 'top');
				monthButton.setAttribute('aria-selected', String(activeTab === 'month'));
				topButton.setAttribute('aria-selected', String(activeTab === 'top'));
				content.replaceChildren(createDonationList(activeTab === 'month' ? donations.thisMonth : donations.topDonators, activeTab));
			};

			monthButton.addEventListener('click', function() {
				activeTab = 'month';
				render();
			});
			topButton.addEventListener('click', function() {
				activeTab = 'top';
				render();
			});

			let loaded = false;
			let refreshTimer;

			const loadDonations = function() {
				fetch(donationApiUrl).then(function(response) {
					if (!response.ok) throw new Error(`Donation API returned ${response.status}`);
					return response.json();
				}).then(function(data) {
					donations = {
						thisMonth: Array.isArray(data.thisMonth) ? data.thisMonth : [],
						topDonators: Array.isArray(data.topDonators) ? data.topDonators : [],
					};
					render();
				}).catch(function(error) {
					console.warn('Unable to load donations.', error);
					content.textContent = 'Unable to load donations.';
				});
			};

			const openPanel = function() {
				overlay.hidden = false;
				toggleButton.setAttribute('aria-expanded', 'true');
				if (!loaded) {
					loaded = true;
					loadDonations();
				}
				if (!refreshTimer) refreshTimer = setInterval(loadDonations, 60000);
				closeButton.focus();
			};

			const closePanel = function() {
				overlay.hidden = true;
				toggleButton.setAttribute('aria-expanded', 'false');
				if (refreshTimer) {
					clearInterval(refreshTimer);
					refreshTimer = undefined;
				}
				toggleButton.focus();
			};

			overlay.addEventListener('click', function(event) {
				if (event.target === overlay) closePanel();
			});
			closeButton.addEventListener('click', closePanel);
			document.addEventListener('keydown', function(event) {
				if (event.key === 'Escape' && !overlay.hidden) closePanel();
			});

			const donationControl = L.control({ position: 'topright' });
			let toggleButton;
			donationControl.onAdd = function() {
				const container = L.DomUtil.create('div', 'leaflet-control donation-toggle-box');
				toggleButton = L.DomUtil.create('a', 'donation-toggle', container);
				toggleButton.href = '#';
				toggleButton.title = 'Donations';
				toggleButton.setAttribute('role', 'button');
				toggleButton.setAttribute('aria-label', 'Open donations');
				toggleButton.setAttribute('aria-expanded', 'false');
				L.DomEvent.disableClickPropagation(container);
				L.DomEvent.on(toggleButton, 'click', L.DomEvent.stop);
				L.DomEvent.on(toggleButton, 'click', function() {
					if (overlay.hidden) openPanel();
					else closePanel();
				});
				return container;
			};

			donationControl.addTo(map);
			map.getContainer().append(overlay);
		}
		// END 329 DONATIONS
