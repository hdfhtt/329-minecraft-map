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

		const defaultDonationAvatar = 'https://mc-heads.net/avatar/MHF_Steve/32.png';

		const createDonationAvatar = function(avatarUrl) {
			const avatar = document.createElement('img');
			avatar.className = 'donation-avatar';
			avatar.alt = '';
			avatar.addEventListener('error', function() {
				if (avatar.dataset.fallback) {
					avatar.classList.add('donation-avatar-unavailable');
					return;
				}
				avatar.dataset.fallback = 'true';
				avatar.src = defaultDonationAvatar;
			});
			avatar.src = avatarUrl || defaultDonationAvatar;
			return avatar;
		};

		const sumDonations = function(items) {
			return items.reduce(function(total, donation) {
				return total + Number(donation.amount || 0);
			}, 0);
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

				if (type === 'top') {
					const rank = document.createElement('div');
					rank.className = 'donation-rank';
					if (index < 3) rank.classList.add(`donation-rank-${index + 1}`);
					rank.textContent = String(index + 1);
					row.append(rank);
				}

				row.append(createDonationAvatar(donation.avatarUrl));

				const info = document.createElement('div');
				info.className = 'donation-info';

				const name = document.createElement('div');
				name.className = 'donation-name';
				name.textContent = donation.gamertag;
				info.append(name);

				if (type === 'month') {
					const meta = document.createElement('div');
					meta.className = 'donation-meta';
					meta.textContent = formatDonationDate(donation.date);
					info.append(meta);
				}

				const amount = document.createElement('div');
				amount.className = 'donation-amount';
				amount.textContent = formatDonationAmount(donation.amount);

				row.append(info, amount);

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
			monthButton.textContent = 'Last 30 Days';

			const topButton = document.createElement('button');
			topButton.className = 'donation-tab';
			topButton.type = 'button';
			topButton.setAttribute('role', 'tab');
			topButton.setAttribute('aria-selected', 'false');
			topButton.textContent = 'Top Donators';

			const content = document.createElement('div');
			content.className = 'donation-content';
			content.textContent = 'Loading donations...';

			const total = document.createElement('div');
			total.className = 'donation-total';
			const totalLabel = document.createElement('span');
			totalLabel.className = 'donation-total-label';
			const totalAmount = document.createElement('span');
			totalAmount.className = 'donation-total-amount';
			total.append(totalLabel, totalAmount);

			const disclaimer = document.createElement('p');
			disclaimer.className = 'donation-disclaimer';
			disclaimer.textContent = 'Every donation goes entirely toward running Minecraft with 329 and its related projects, including the Discord bot and this map portal. None of it is used for personal purposes.';

			tabs.append(monthButton, topButton);
			panel.append(header, tabs, content, total, disclaimer);
			overlay.append(panel);

			let donations = { thisMonth: [], topDonators: [] };
			let activeTab = 'month';

			const render = function() {
				monthButton.classList.toggle('donation-tab-active', activeTab === 'month');
				topButton.classList.toggle('donation-tab-active', activeTab === 'top');
				monthButton.setAttribute('aria-selected', String(activeTab === 'month'));
				topButton.setAttribute('aria-selected', String(activeTab === 'top'));
				content.replaceChildren(createDonationList(activeTab === 'month' ? donations.thisMonth : donations.topDonators, activeTab));
				if (activeTab === 'month') {
					total.style.visibility = '';
					totalLabel.textContent = 'Last 30 days total';
					totalAmount.textContent = formatDonationAmount(sumDonations(donations.thisMonth));
				} else {
					total.style.visibility = 'hidden';
				}
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
