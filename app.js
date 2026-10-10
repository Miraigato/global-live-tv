// Global Live TV App Engine
let allChannels = [];
let filteredChannels = [];
let currentChannel = null;
let allVodItems = [];
let filteredVodItems = [];
let currentVodItem = null;
let currentMode = 'live'; // 'live' or 'vod'
let hlsInstance = null;
let favorites = JSON.parse(localStorage.getItem('globaltv_favs') || '[]');
let deadChannels = JSON.parse(localStorage.getItem('globaltv_dead_channels') || '{}'); // { [chId]: timestamp }
let displayedCount = 60;
const PAGE_SIZE = 60;

// Filter State
let selectedCountry = 'IL';
let selectedCategory = 'ALL';
let searchQuery = '';
let showFavoritesOnly = false;
let sortOption = 'default';
let isCheckingCurrentCountry = false;

// DOM Elements
const liveModeBtn = document.getElementById('liveModeBtn');
const vodModeBtn = document.getElementById('vodModeBtn');
const videoEl = document.getElementById('videoElement');
const placeholderEl = document.getElementById('placeholder');
const streamOverlayEl = document.getElementById('streamOverlay');
const overlayLogoEl = document.getElementById('overlayLogo');
const overlayNameEl = document.getElementById('overlayName');
const overlayMetaEl = document.getElementById('overlayMeta');
const overlayFavBtn = document.getElementById('overlayFavBtn');
const theaterBtn = document.getElementById('theaterBtn');
const overlayFullscreenBtn = document.getElementById('overlayFullscreenBtn');
const playerStatusText = document.getElementById('playerStatusText');
const playerPanel = document.querySelector('.player-panel');
const playerBox = document.getElementById('playerBox');

const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const favTabBtn = document.getElementById('favTabBtn');
const favCountEl = document.getElementById('favCount');
const randomChannelBtn = document.getElementById('randomChannelBtn');

const countriesListEl = document.getElementById('countriesList');
const categoriesListEl = document.getElementById('categoriesList');
const countriesFilterCountEl = document.getElementById('countriesFilterCount');
const categoriesFilterCountEl = document.getElementById('categoriesFilterCount');

const quickCountriesBar = document.getElementById('quickCountriesBar');
const viewHeading = document.getElementById('viewHeading');
const totalMatchesCount = document.getElementById('totalMatchesCount');
const sortSelect = document.getElementById('sortSelect');
const checkActiveChannelsBtn = document.getElementById('checkActiveChannelsBtn');
const checkProgressBadge = document.getElementById('checkProgressBadge');

const channelsGrid = document.getElementById('channelsGrid');
const gridLoading = document.getElementById('gridLoading');
const gridEmpty = document.getElementById('gridEmpty');
const loadMoreContainer = document.getElementById('loadMoreContainer');
const loadMoreBtn = document.getElementById('loadMoreBtn');

// Modal Elements
const overlaySourceBtn = document.getElementById('overlaySourceBtn');
const sourceModal = document.getElementById('sourceModal');
const modalChannelTitle = document.getElementById('modalChannelTitle');
const modalUrlInput = document.getElementById('modalUrlInput');
const copyUrlBtn = document.getElementById('copyUrlBtn');
const openUrlLink = document.getElementById('openUrlLink');
const closeModalBtn = document.getElementById('closeModalBtn');
const toastNotification = document.getElementById('toastNotification');

// Initialize
async function init() {
  updateFavoritesBadge();
  setupEventListeners();

  try {
    // Load channels
    if (window.EMBEDDED_CHANNELS) {
      allChannels = window.EMBEDDED_CHANNELS;
    } else {
      const res = await fetch('channels.json');
      if (res.ok) allChannels = await res.json();
    }

    // Load VOD items
    if (window.EMBEDDED_VOD) {
      allVodItems = window.EMBEDDED_VOD;
    } else {
      try {
        const vodRes = await fetch('vod.json');
        if (vodRes.ok) allVodItems = await vodRes.json();
      } catch (e) {
        console.warn('VOD load warning:', e);
      }
    }

    gridLoading.style.display = 'none';

    buildSidebarFilters();
    applyFilters();

    // Auto-select a top Israeli or popular channel if available
    const initialCandidate = allChannels.find(c => c.country === 'IL' && c.name.includes('Kan 11')) ||
                             allChannels.find(c => c.country === 'IL') ||
                             allChannels[0];
    if (initialCandidate) {
      playChannel(initialCandidate);
    }
  } catch (err) {
    console.error('Initialization error:', err);
    gridLoading.innerHTML = `<p style="color:var(--danger)">שגיאה בטעינת הערוצים: ${err.message}</p>`;
  }
}

// Build Sidebar Filters
function buildSidebarFilters() {
  if (currentMode === 'vod') {
    // Build categories for VOD
    const vodCategoryCounts = {};
    allVodItems.forEach(item => {
      const cat = item.category || 'כללי';
      vodCategoryCounts[cat] = (vodCategoryCounts[cat] || 0) + 1;
    });

    // Sidebar: Countries box turns into Types (Movies / Series)
    const movieCount = allVodItems.filter(v => v.type === 'movie').length;
    const seriesCount = allVodItems.filter(v => v.type === 'series').length;

    countriesFilterCountEl.textContent = '2';
    countriesListEl.innerHTML = `
      <button class="filter-btn ${selectedCountry === 'ALL' ? 'active' : ''}" data-country="ALL">
        <span>🎬 כל התכנים</span>
        <span class="filter-badge">${allVodItems.length}</span>
      </button>
      <button class="filter-btn ${selectedCountry === 'movie' ? 'active' : ''}" data-country="movie">
        <span>🍿 סרטים ישראליים</span>
        <span class="filter-badge">${movieCount}</span>
      </button>
      <button class="filter-btn ${selectedCountry === 'series' ? 'active' : ''}" data-country="series">
        <span>📺 סדרות ישראליות</span>
        <span class="filter-badge">${seriesCount}</span>
      </button>
    `;

    // Category list for VOD
    const sortedVodCats = Object.entries(vodCategoryCounts).sort((a, b) => b[1] - a[1]);
    categoriesFilterCountEl.textContent = sortedVodCats.length;

    let catHTML = `
      <button class="filter-btn ${selectedCategory === 'ALL' ? 'active' : ''}" data-category="ALL">
        <span>כל הז'אנרים</span>
        <span class="filter-badge">${allVodItems.length}</span>
      </button>
    `;

    sortedVodCats.forEach(([cat, count]) => {
      catHTML += `
        <button class="filter-btn ${selectedCategory === cat ? 'active' : ''}" data-category="${cat}">
          <span>${cat}</span>
          <span class="filter-badge">${count}</span>
        </button>
      `;
    });
    categoriesListEl.innerHTML = catHTML;
    return;
  }

  // Count by country
  const countryCounts = {};
  const categoryCounts = {};

  allChannels.forEach(c => {
    const code = c.country || 'OTHER';
    countryCounts[code] = (countryCounts[code] || 0) + 1;

    const cat = c.category || 'General';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  // Top Countries - place IL first
  const countriesWithoutIL = Object.entries(countryCounts)
    .filter(([code]) => code !== 'IL')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 35);

  const ilCount = countryCounts['IL'] || 0;
  const sortedCountries = [['IL', ilCount], ...countriesWithoutIL];

  countriesFilterCountEl.textContent = sortedCountries.length;

  let countriesHTML = `
    <button class="filter-btn ${selectedCountry === 'IL' ? 'active' : ''}" data-country="IL">
      <span>🇮🇱 ישראל</span>
      <span class="filter-badge">${ilCount}</span>
    </button>
    <button class="filter-btn ${selectedCountry === 'ALL' ? 'active' : ''}" data-country="ALL">
      <span>🌐 כל המדינות</span>
      <span class="filter-badge">${allChannels.length}</span>
    </button>
  `;

  sortedCountries.filter(([code]) => code !== 'IL').forEach(([code, count]) => {
    const sample = allChannels.find(c => (c.country || 'OTHER') === code);
    const label = sample ? `${sample.flag} ${sample.countryName || code}` : code;
    countriesHTML += `
      <button class="filter-btn ${selectedCountry === code ? 'active' : ''}" data-country="${code}">
        <span>${label}</span>
        <span class="filter-badge">${count}</span>
      </button>
    `;
  });
  countriesListEl.innerHTML = countriesHTML;

  // Categories
  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1]);

  categoriesFilterCountEl.textContent = sortedCategories.length;

  let catHTML = `
    <button class="filter-btn ${selectedCategory === 'ALL' ? 'active' : ''}" data-category="ALL">
      <span>הכל</span>
      <span class="filter-badge">${allChannels.length}</span>
    </button>
  `;

  sortedCategories.forEach(([cat, count]) => {
    catHTML += `
      <button class="filter-btn ${selectedCategory === cat ? 'active' : ''}" data-category="${cat}">
        <span>${cat}</span>
        <span class="filter-badge">${count}</span>
      </button>
    `;
  });
  categoriesListEl.innerHTML = catHTML;
}

// Filter Logic
function applyFilters() {
  displayedCount = PAGE_SIZE;

  if (currentMode === 'vod') {
    filteredVodItems = allVodItems.filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchCat = (item.category || '').toLowerCase().includes(q);
        const matchCast = (item.cast || '').toLowerCase().includes(q);
        const matchDesc = (item.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchCast && !matchDesc) return false;
      }

      // In VOD mode, selectedCountry acts as type filter (movie / series / ALL)
      if (selectedCountry !== 'ALL' && selectedCountry !== 'IL') {
        if (item.type !== selectedCountry) return false;
      }

      if (selectedCategory !== 'ALL') {
        if (item.category !== selectedCategory) return false;
      }

      if (showFavoritesOnly) {
        if (!favorites.includes(item.id || item.streamUrl)) return false;
      }

      return true;
    });

    if (sortOption === 'nameAsc') {
      filteredVodItems.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    updateHeading();
    renderGrid();
    return;
  }

  filteredChannels = allChannels.filter(c => {
    // Search text
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = (c.name || '').toLowerCase().includes(q);
      const matchCountry = (c.countryName || '').toLowerCase().includes(q) || (c.country || '').toLowerCase().includes(q);
      const matchCat = (c.category || '').toLowerCase().includes(q);
      if (!matchName && !matchCountry && !matchCat) return false;
    }

    // Country filter
    if (selectedCountry !== 'ALL') {
      if (c.country !== selectedCountry) return false;
    }

    // Category filter
    if (selectedCategory !== 'ALL') {
      if (c.category !== selectedCategory) return false;
    }

    // Favorites
    if (showFavoritesOnly) {
      if (!favorites.includes(c.id || c.url)) return false;
    }

    return true;
  });

  // Sorting - Always prioritize active channels, push dead/inactive to the bottom!
  filteredChannels.sort((a, b) => {
    const aId = a.id || a.url;
    const bId = b.id || b.url;
    const aDead = deadChannels[aId] ? 1 : 0;
    const bDead = deadChannels[bId] ? 1 : 0;

    // Inactive channels always sink to the bottom
    if (aDead !== bDead) {
      return aDead - bDead;
    }

    if (sortOption === 'nameAsc') {
      return (a.name || '').localeCompare(b.name || '');
    } else if (sortOption === 'country') {
      return (a.countryName || '').localeCompare(b.countryName || '');
    }
    return 0;
  });

  // Update UI heading
  updateHeading();
  renderGrid();
}

function updateHeading() {
  if (currentMode === 'vod') {
    let title = 'ספריית VOD ישראלי 🎬';
    if (showFavoritesOnly) {
      title = '⭐ כותרים מועדפים';
    } else if (searchQuery) {
      title = `תוצאות חיפוש VOD עבור "${searchQuery}"`;
    } else if (selectedCountry === 'movie') {
      title = '🍿 סרטי קולנוע ישראליים';
    } else if (selectedCountry === 'series') {
      title = '📺 סדרות טלוויזיה ישראליות';
    } else if (selectedCategory !== 'ALL') {
      title = `VOD: ${selectedCategory}`;
    }
    viewHeading.textContent = title;
    totalMatchesCount.textContent = `${filteredVodItems.length.toLocaleString()} כותרים`;
    return;
  }

  let title = 'ערוצים נבחרים';
  if (showFavoritesOnly) {
    title = '⭐ ערוצים מועדפים';
  } else if (searchQuery) {
    title = `תוצאות חיפוש עבור "${searchQuery}"`;
  } else if (selectedCountry !== 'ALL') {
    const sample = allChannels.find(c => c.country === selectedCountry);
    title = sample ? `${sample.flag} ערוצים מ${sample.countryName}` : `ערוצים (${selectedCountry})`;
  } else if (selectedCategory !== 'ALL') {
    title = `ערוצי ${selectedCategory}`;
  }

  viewHeading.textContent = title;
  const activeCount = filteredChannels.filter(c => !deadChannels[c.id || c.url]).length;
  totalMatchesCount.textContent = `${filteredChannels.length.toLocaleString()} ערוצים (${activeCount} פעילים)`;
}

// Render Channels or VOD Grid
function renderGrid() {
  if (currentMode === 'vod') {
    renderVodGrid();
    return;
  }

  if (filteredChannels.length === 0) {
    channelsGrid.innerHTML = '';
    gridEmpty.style.display = 'block';
    loadMoreContainer.style.display = 'none';
    return;
  }

  gridEmpty.style.display = 'none';
  const slice = filteredChannels.slice(0, displayedCount);

  let html = '';
  slice.forEach(channel => {
    const chId = channel.id || channel.url;
    const isFav = favorites.includes(chId);
    const isDead = !!deadChannels[chId];
    const isActive = currentChannel && (currentChannel.id === channel.id || currentChannel.url === channel.url);
    const logoUrl = channel.logo || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2364748b"><rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>';

    html += `
      <div class="channel-card ${isActive ? 'active' : ''} ${isDead ? 'channel-offline' : ''}" data-url="${encodeURIComponent(channel.url)}" data-id="${encodeURIComponent(chId)}">
        <button class="card-fav-btn ${isFav ? 'is-fav' : ''}" data-fav-id="${encodeURIComponent(chId)}" title="${isFav ? 'הסר ממועדפים' : 'הוסף למועדפים'}">
          ★
        </button>
        <button class="card-source-btn" data-url="${encodeURIComponent(channel.url)}" data-name="${encodeURIComponent(channel.name)}" title="הצג קישור מקור">
          🔗
        </button>
        <div class="logo-wrapper">
          <img src="${logoUrl}" class="card-logo" alt="${channel.name}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24\\' fill=\\'%2364748b\\'><path d=\\'M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z\\'/></svg>'">
        </div>
        <div class="card-name" title="${channel.name}">${channel.name}</div>
        <div class="card-details">
          <span>${channel.flag || '🌐'} ${channel.country || ''}</span>
          ${channel.category ? `<span class="card-tag">${channel.category}</span>` : ''}
        </div>
        ${isDead ? `<span class="offline-pill" title="ערוץ לא זמין / לא פעיל">לא פעיל</span>` : ''}
      </div>
    `;
  });

  channelsGrid.innerHTML = html;

  if (displayedCount < filteredChannels.length) {
    loadMoreContainer.style.display = 'flex';
  } else {
    loadMoreContainer.style.display = 'none';
  }
}

// Render VOD Grid
function renderVodGrid() {
  if (filteredVodItems.length === 0) {
    channelsGrid.innerHTML = '';
    gridEmpty.style.display = 'block';
    loadMoreContainer.style.display = 'none';
    return;
  }

  gridEmpty.style.display = 'none';
  const slice = filteredVodItems.slice(0, displayedCount);

  let html = '';
  slice.forEach(item => {
    const itemId = item.id || item.streamUrl;
    const isFav = favorites.includes(itemId);
    const isActive = currentVodItem && currentVodItem.id === item.id;
    const typeLabel = item.type === 'movie' ? '🎬 סרט' : '📺 סדרה';
    const metaExtra = item.duration || item.seasons || item.year;

    html += `
      <div class="vod-card ${isActive ? 'active' : ''}" data-vod-id="${encodeURIComponent(item.id)}" data-url="${encodeURIComponent(item.streamUrl)}">
        <button class="card-fav-btn ${isFav ? 'is-fav' : ''}" data-fav-id="${encodeURIComponent(itemId)}" title="${isFav ? 'הסר ממועדפים' : 'הוסף למועדפים'}">
          ★
        </button>
        <button class="card-source-btn" data-url="${encodeURIComponent(item.streamUrl)}" data-name="${encodeURIComponent(item.title)}" title="הצג קישור מקור">
          🔗
        </button>
        <div class="vod-poster-wrapper">
          <img src="${item.poster}" class="vod-poster" alt="${item.title}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'%23374151\\'><rect width=\\'24\\' height=\\'24\\'/><text x=\\'50%\\' y=\\'50%\\' fill=\\'%239ca3af\\' font-size=\\'12\\' text-anchor=\\'middle\\' dy=\\'.3em\\'>VOD</text></svg>'">
          <div class="vod-play-overlay">
            <div class="vod-play-icon">▶</div>
          </div>
          <span class="vod-type-badge">${typeLabel}</span>
        </div>
        <div class="vod-info">
          <div class="vod-title" title="${item.title}">${item.title}</div>
          <div class="vod-meta">
            <span>📅 ${item.year || ''}</span>
            ${metaExtra ? `<span>• ${metaExtra}</span>` : ''}
            <span class="card-tag">${item.category}</span>
          </div>
          <p class="vod-desc" title="${item.description}">${item.description}</p>
        </div>
      </div>
    `;
  });

  channelsGrid.innerHTML = html;

  if (displayedCount < filteredVodItems.length) {
    loadMoreContainer.style.display = 'flex';
  } else {
    loadMoreContainer.style.display = 'none';
  }
}

// Video Player Engine with Hls.js
function playChannel(channel) {
  currentChannel = channel;
  placeholderEl.style.display = 'none';
  streamOverlayEl.style.display = 'flex';

  overlayLogoEl.src = channel.logo || '';
  overlayNameEl.textContent = channel.name;
  overlayMetaEl.textContent = `${channel.flag || '🌐'} ${channel.countryName || channel.country} • ${channel.category || 'כללי'}`;

  const chId = channel.id || channel.url;
  overlayFavBtn.classList.toggle('is-fav', favorites.includes(chId));

  setStreamStatus('connecting', 'מתחבר לשידור...');

  // Highlight active card
  document.querySelectorAll('.channel-card').forEach(c => {
    if (c.dataset.id === encodeURIComponent(chId)) {
      c.classList.add('active');
    } else {
      c.classList.remove('active');
    }
  });

  const streamUrl = channel.url;

  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }

  // Check Hls.js support
  if (Hls.isSupported() && (streamUrl.includes('.m3u8') || !videoEl.canPlayType('application/vnd.apple.mpegurl'))) {
    hlsInstance = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      manifestLoadingMaxRetry: 3,
      levelLoadingMaxRetry: 3
    });

    hlsInstance.loadSource(streamUrl);
    hlsInstance.attachMedia(videoEl);

    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      videoEl.play().catch(e => console.warn('Autoplay prevented:', e));
      setStreamStatus('playing', 'שידור חי יציב');
    });

    hlsInstance.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            setStreamStatus('error', 'שגיאת רשת / הזרמה מוגנת');
            markChannelDead(channel);
            hlsInstance.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            setStreamStatus('error', 'משחזר שגיאת מדיה...');
            hlsInstance.recoverMediaError();
            break;
          default:
            setStreamStatus('error', 'ערוץ לא זמין כעת');
            markChannelDead(channel);
            hlsInstance.destroy();
            break;
        }
      }
    });
  } else if (videoEl.canPlayType('application/vnd.apple.mpegurl') || streamUrl.endsWith('.mp4')) {
    // Native Safari / Apple HLS or direct mp4
    videoEl.src = streamUrl;
    videoEl.play().catch(e => console.warn('Autoplay prevented:', e));
    setStreamStatus('playing', 'שידור חי');
  } else {
    videoEl.src = streamUrl;
    videoEl.play().catch(e => console.warn('Autoplay prevented:', e));
  }

  videoEl.onplaying = () => {
    setStreamStatus('playing', 'בשידור חי 🟢');
    markChannelAlive(channel);
  };

  videoEl.onerror = () => {
    setStreamStatus('error', 'שידור לא זמין זמנית');
    markChannelDead(channel);
  };
}

// VOD Player Engine
function playVodItem(item) {
  currentVodItem = item;
  currentChannel = null; // reset live channel
  placeholderEl.style.display = 'none';
  streamOverlayEl.style.display = 'flex';

  overlayLogoEl.src = item.poster || '';
  overlayNameEl.textContent = item.title;
  const metaType = item.type === 'movie' ? '🎬 סרט ישראלי' : '📺 סדרה ישראלית';
  overlayMetaEl.textContent = `${metaType} • ${item.year || ''} • ${item.category || ''}`;

  const itemId = item.id || item.streamUrl;
  overlayFavBtn.classList.toggle('is-fav', favorites.includes(itemId));

  setStreamStatus('connecting', 'טוען סרט / סדרה...');

  // Highlight active VOD card
  document.querySelectorAll('.vod-card').forEach(c => {
    if (c.dataset.vodId === encodeURIComponent(item.id)) {
      c.classList.add('active');
    } else {
      c.classList.remove('active');
    }
  });

  const streamUrl = item.streamUrl;

  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }

  // Determine stream type: HLS (.m3u8) or Direct MP4
  if (streamUrl.includes('.m3u8')) {
    if (Hls.isSupported()) {
      hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: false
      });
      hlsInstance.loadSource(streamUrl);
      hlsInstance.attachMedia(videoEl);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        videoEl.play().catch(e => console.warn('Autoplay prevented:', e));
        setStreamStatus('playing', 'מנגן VOD ✨');
      });
      hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setStreamStatus('error', 'שגיאה בטעינת הפרק/הסרט');
        }
      });
    } else {
      videoEl.src = streamUrl;
      videoEl.play().catch(e => console.warn('Autoplay prevented:', e));
      setStreamStatus('playing', 'מנגן VOD ✨');
    }
  } else {
    // Direct MP4 or other video file
    videoEl.src = streamUrl;
    videoEl.play().catch(e => console.warn('Autoplay prevented:', e));
    setStreamStatus('playing', 'מנגן סרט ישראלי 🎬');
  }

  videoEl.onplaying = () => {
    setStreamStatus('playing', 'מנגן באיכות גבוהה 🟢');
  };

  videoEl.onerror = () => {
    setStreamStatus('error', 'קובץ הווידאו אינו זמין כרגע');
  };
}

function markChannelDead(ch) {
  if (!ch) return;
  const chId = ch.id || ch.url;
  if (!deadChannels[chId]) {
    deadChannels[chId] = Date.now();
    localStorage.setItem('globaltv_dead_channels', JSON.stringify(deadChannels));
    // Visually update the card
    const card = document.querySelector(`.channel-card[data-id="${encodeURIComponent(chId)}"]`);
    if (card) {
      card.classList.add('channel-offline');
      if (!card.querySelector('.offline-pill')) {
        const pill = document.createElement('span');
        pill.className = 'offline-pill';
        pill.title = 'ערוץ לא זמין / לא פעיל';
        pill.textContent = 'לא פעיל';
        card.appendChild(pill);
      }
    }
  }
}

function markChannelAlive(ch) {
  if (!ch) return;
  const chId = ch.id || ch.url;
  if (deadChannels[chId]) {
    delete deadChannels[chId];
    localStorage.setItem('globaltv_dead_channels', JSON.stringify(deadChannels));
    const card = document.querySelector(`.channel-card[data-id="${encodeURIComponent(chId)}"]`);
    if (card) {
      card.classList.remove('channel-offline');
      const pill = card.querySelector('.offline-pill');
      if (pill) pill.remove();
    }
  }
}

function setStreamStatus(type, msg) {
  playerStatusText.className = `badge-status status-${type}`;
  playerStatusText.textContent = msg;
}

// Toggle Favorite
function toggleFavorite(chId) {
  const index = favorites.indexOf(chId);
  if (index === -1) {
    favorites.push(chId);
  } else {
    favorites.splice(index, 1);
  }
  localStorage.setItem('globaltv_favs', JSON.stringify(favorites));
  updateFavoritesBadge();

  if (currentChannel && (currentChannel.id === chId || currentChannel.url === chId)) {
    overlayFavBtn.classList.toggle('is-fav', favorites.includes(chId));
  }

  if (showFavoritesOnly) {
    applyFilters();
  } else {
    // Update active icons in grid
    document.querySelectorAll(`.card-fav-btn[data-fav-id="${encodeURIComponent(chId)}"]`).forEach(b => {
      b.classList.toggle('is-fav', favorites.includes(chId));
    });
  }
}

function updateFavoritesBadge() {
  favCountEl.textContent = favorites.length;
}

// Event Listeners
function setupEventListeners() {
  // Search
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
    applyFilters();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    applyFilters();
    searchInput.focus();
  });

  // Sort
  sortSelect.addEventListener('change', (e) => {
    sortOption = e.target.value;
    applyFilters();
  });

  // Fav Filter Tab
  favTabBtn.addEventListener('click', () => {
    showFavoritesOnly = !showFavoritesOnly;
    favTabBtn.classList.toggle('active', showFavoritesOnly);
    applyFilters();
  });

  // Random Channel
  randomChannelBtn.addEventListener('click', () => {
    if (filteredChannels.length === 0) return;
    const randomIdx = Math.floor(Math.random() * filteredChannels.length);
    playChannel(filteredChannels[randomIdx]);
  });

  // Overlay Fav button
  overlayFavBtn.addEventListener('click', () => {
    if (currentChannel) {
      toggleFavorite(currentChannel.id || currentChannel.url);
    }
  });



  // Clean Fullscreen handler - triggered via button and keyboard shortcut (F key or double-click on wrapper background)
  function toggleFullscreen() {
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (videoEl.requestFullscreen) {
          videoEl.requestFullscreen().catch(() => {});
        } else if (videoEl.webkitRequestFullscreen) {
          videoEl.webkitRequestFullscreen();
        } else if (videoEl.webkitEnterFullscreen) {
          videoEl.webkitEnterFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    } catch (e) {
      console.warn('Fullscreen toggle failed:', e);
    }
  }

  // Keyboard shortcut: Press 'F' for full screen
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      toggleFullscreen();
    }
  });

  // Fullscreen button in overlay
  if (overlayFullscreenBtn) {
    overlayFullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFullscreen();
    });
  }

  // Theater Mode
  theaterBtn.addEventListener('click', () => {
    playerPanel.classList.toggle('theater-mode');
  });

  // Quick Countries Bar
  quickCountriesBar.addEventListener('click', (e) => {
    const pill = e.target.closest('.pill');
    if (!pill) return;

    quickCountriesBar.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');

    selectedCountry = pill.dataset.country;

    // sync sidebar
    countriesListEl.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.country === selectedCountry);
    });

    applyFilters();
  });

  // Sidebar Country Click
  countriesListEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    countriesListEl.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    selectedCountry = btn.dataset.country;

    // sync quick bar
    quickCountriesBar.querySelectorAll('.pill').forEach(p => {
      p.classList.toggle('active', p.dataset.country === selectedCountry);
    });

    applyFilters();
  });

  // Sidebar Category Click
  categoriesListEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    categoriesListEl.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    selectedCategory = btn.dataset.category;
    applyFilters();
  });

  // Mode Toggles (Live TV vs VOD)
  if (liveModeBtn) {
    liveModeBtn.addEventListener('click', () => {
      if (currentMode === 'live') return;
      currentMode = 'live';
      liveModeBtn.classList.add('active');
      vodModeBtn.classList.remove('active');
      quickCountriesBar.parentElement.style.display = 'block';
      checkActiveChannelsBtn.style.display = 'inline-flex';
      selectedCountry = 'IL';
      selectedCategory = 'ALL';
      searchQuery = '';
      searchInput.value = '';
      buildSidebarFilters();
      applyFilters();
    });
  }

  if (vodModeBtn) {
    vodModeBtn.addEventListener('click', () => {
      if (currentMode === 'vod') return;
      currentMode = 'vod';
      vodModeBtn.classList.add('active');
      liveModeBtn.classList.remove('active');
      quickCountriesBar.parentElement.style.display = 'none';
      checkActiveChannelsBtn.style.display = 'none';
      selectedCountry = 'ALL';
      selectedCategory = 'ALL';
      searchQuery = '';
      searchInput.value = '';
      buildSidebarFilters();
      applyFilters();
    });
  }

  // Channel & VOD Card Click & Fav Click delegation
  channelsGrid.addEventListener('click', (e) => {
    const favBtn = e.target.closest('.card-fav-btn');
    if (favBtn) {
      e.stopPropagation();
      const favId = decodeURIComponent(favBtn.dataset.favId);
      toggleFavorite(favId);
      return;
    }

    const sourceBtn = e.target.closest('.card-source-btn');
    if (sourceBtn) {
      e.stopPropagation();
      const url = decodeURIComponent(sourceBtn.dataset.url);
      const name = decodeURIComponent(sourceBtn.dataset.name);
      openSourceModal(name, url);
      return;
    }

    // VOD Card Click
    const vodCard = e.target.closest('.vod-card');
    if (vodCard) {
      const vodId = decodeURIComponent(vodCard.dataset.vodId);
      const item = allVodItems.find(v => v.id === vodId);
      if (item) {
        playVodItem(item);
      }
      return;
    }

    // Live Channel Card Click
    const card = e.target.closest('.channel-card');
    if (card) {
      const url = decodeURIComponent(card.dataset.url);
      const ch = allChannels.find(c => c.url === url);
      if (ch) {
        playChannel(ch);
      }
    }
  });

  // Overlay Source button click
  if (overlaySourceBtn) {
    overlaySourceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentChannel) {
        openSourceModal(currentChannel.name, currentChannel.url);
      }
    });
  }

  // Modal event listeners
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeSourceModal);
  }

  if (sourceModal) {
    sourceModal.addEventListener('click', (e) => {
      if (e.target === sourceModal) {
        closeSourceModal();
      }
    });
  }

  if (copyUrlBtn) {
    copyUrlBtn.addEventListener('click', () => {
      const url = modalUrlInput.value;
      if (!url) return;
      navigator.clipboard.writeText(url).then(() => {
        showToast('הקישור הועתק ללוח! 📋');
      }).catch(() => {
        // Fallback copy
        modalUrlInput.select();
        document.execCommand('copy');
        showToast('הקישור הועתק ללוח! 📋');
      });
    });
  }

  // Manual / Automated Channel Filtering & Health Testing
  if (checkActiveChannelsBtn) {
    checkActiveChannelsBtn.addEventListener('click', () => {
      if (isCheckingCurrentCountry) return;
      testCurrentCountryChannels();
    });
  }

  // Load More
  loadMoreBtn.addEventListener('click', () => {
    displayedCount += PAGE_SIZE;
    renderGrid();
  });
}

// Check Channels in current country with concurrency
async function testCurrentCountryChannels() {
  if (filteredChannels.length === 0) return;
  isCheckingCurrentCountry = true;
  checkActiveChannelsBtn.classList.add('checking');
  checkProgressBadge.style.display = 'inline-block';
  checkProgressBadge.textContent = '0%';

  const targetChannels = [...filteredChannels];
  const total = targetChannels.length;
  let tested = 0;
  const CONCURRENCY = 6;
  let index = 0;

  async function worker() {
    while (index < targetChannels.length) {
      const ch = targetChannels[index++];
      const chId = ch.id || ch.url;
      const streamUrl = ch.url;

      try {
        const isOk = await testSingleStream(streamUrl);
        if (isOk) {
          markChannelAlive(ch);
        } else {
          markChannelDead(ch);
        }
      } catch (err) {
        markChannelDead(ch);
      }

      tested++;
      const pct = Math.round((tested / total) * 100);
      checkProgressBadge.textContent = `${pct}%`;
    }
  }

  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  isCheckingCurrentCountry = false;
  checkActiveChannelsBtn.classList.remove('checking');
  checkProgressBadge.textContent = 'הושלם ✓';
  setTimeout(() => {
    checkProgressBadge.style.display = 'none';
  }, 2500);

  // Re-apply filters so dead channels move to bottom immediately!
  applyFilters();
}

// Lightweight stream tester: uses fetch with abort controller
function testSingleStream(url) {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      resolve(false);
    }, 4500); // 4.5s max per probe

    fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      signal: controller.signal
    }).then(() => {
      clearTimeout(timeout);
      resolve(true);
    }).catch(() => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

// Source Link Modal & Toast helpers
function openSourceModal(name, url) {
  if (!url) return;
  modalChannelTitle.textContent = `קישור מקור: ${name || 'ערוץ'}`;
  modalUrlInput.value = url;
  openUrlLink.href = url;
  sourceModal.style.display = 'flex';
}

function closeSourceModal() {
  sourceModal.style.display = 'none';
}

function showToast(msg) {
  toastNotification.textContent = msg;
  toastNotification.style.display = 'block';
  setTimeout(() => {
    toastNotification.style.display = 'none';
  }, 2200);
}

// Start
init();
