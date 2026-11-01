// Global Live TV App Engine
let allChannels = [];
let filteredChannels = [];
let currentChannel = null;
let allVodItems = [];
let filteredVodItems = [];
let currentVodItem = null;
let currentSeries = null;
let currentEpisode = null;
let selectedSeason = 'ALL';
let currentMode = 'live'; // 'live', 'movies', 'series'
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
const moviesModeBtn = document.getElementById('moviesModeBtn');
const seriesModeBtn = document.getElementById('seriesModeBtn');
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
const playerPipPlaceholder = document.getElementById('playerPipPlaceholder');
const pipRestoreBtn = document.getElementById('pipRestoreBtn');
const browsePanel = document.querySelector('.browse-panel');

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

// Series Modal Elements & Overlay Buttons
const seriesModal = document.getElementById('seriesModal');
const closeSeriesModalBtn = document.getElementById('closeSeriesModalBtn');
const seriesBackdropImg = document.getElementById('seriesBackdropImg');
const seriesModalPoster = document.getElementById('seriesModalPoster');
const seriesModalTitle = document.getElementById('seriesModalTitle');
const seriesModalDesc = document.getElementById('seriesModalDesc');
const seriesModalCast = document.getElementById('seriesModalCast');
const seriesModalCategory = document.getElementById('seriesModalCategory');
const seriesModalYear = document.getElementById('seriesModalYear');
const seriesModalSeasons = document.getElementById('seriesModalSeasons');
const seriesPlayFirstBtn = document.getElementById('seriesPlayFirstBtn');
const seriesFavBtn = document.getElementById('seriesFavBtn');
const seriesSeasonsBar = document.getElementById('seriesSeasonsBar');
const episodesGrid = document.getElementById('episodesGrid');
const seriesEpTotalBadge = document.getElementById('seriesEpTotalBadge');
const overlayEpisodesBtn = document.getElementById('overlayEpisodesBtn');
const overlayPrevEpBtn = document.getElementById('overlayPrevEpBtn');
const overlayNextEpBtn = document.getElementById('overlayNextEpBtn');

// Password Lock Screen (Current Year 2026)
const SITE_PASSWORD = '2026';
let isSiteUnlocked = false;

const authLockScreen = document.getElementById('authLockScreen');
const authForm = document.getElementById('authForm');
const authPasswordInput = document.getElementById('authPasswordInput');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authToggleVisibilityBtn = document.getElementById('authToggleVisibilityBtn');
const authErrorMsg = document.getElementById('authErrorMsg');
const lockSiteBtn = document.getElementById('lockSiteBtn');

function initAuth() {
  const saved = localStorage.getItem('globaltv_auth') || sessionStorage.getItem('globaltv_auth');
  if (saved === SITE_PASSWORD) {
    unlockSite(false);
  } else {
    lockSite();
  }

  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAuthSubmit();
    });
  }

  if (authSubmitBtn) {
    authSubmitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleAuthSubmit();
    });
  }

  if (authToggleVisibilityBtn && authPasswordInput) {
    authToggleVisibilityBtn.addEventListener('click', () => {
      const isPwd = authPasswordInput.type === 'password';
      authPasswordInput.type = isPwd ? 'text' : 'password';
      authToggleVisibilityBtn.textContent = isPwd ? '🙈' : '👁️';
    });
  }

  if (lockSiteBtn) {
    lockSiteBtn.addEventListener('click', () => {
      localStorage.removeItem('globaltv_auth');
      sessionStorage.removeItem('globaltv_auth');
      lockSite();
      showToast('🔒 האתר ננעל בהצלחה');
    });
  }
}

function handleAuthSubmit() {
  if (!authPasswordInput) return;
  const val = (authPasswordInput.value || '').trim();
  if (val === SITE_PASSWORD) {
    localStorage.setItem('globaltv_auth', SITE_PASSWORD);
    sessionStorage.setItem('globaltv_auth', SITE_PASSWORD);
    unlockSite(true);
    showToast('🔓 הכניסה אושרה!');
  } else {
    if (authErrorMsg) authErrorMsg.style.display = 'block';
    authPasswordInput.classList.add('error');
    authPasswordInput.value = '';
    setTimeout(() => {
      authPasswordInput.classList.remove('error');
      authPasswordInput.focus();
    }, 450);
  }
}

function unlockSite(animate = true) {
  isSiteUnlocked = true;
  if (authErrorMsg) authErrorMsg.style.display = 'none';
  if (authLockScreen) {
    authLockScreen.classList.add('unlocked');
    if (!animate) {
      authLockScreen.style.display = 'none';
    } else {
      setTimeout(() => {
        authLockScreen.style.display = 'none';
      }, 350);
    }
  }
  document.body.style.overflow = '';

  // Start default stream if not already playing and channels loaded
  if (!currentChannel && !currentVodItem && allChannels.length > 0) {
    const candidate = allChannels.find(c => c.country === 'IL' && c.name.includes('Kan 11')) ||
                     allChannels.find(c => c.country === 'IL') ||
                     allChannels[0];
    if (candidate) {
      playChannel(candidate);
    }
  }
}

function lockSite() {
  isSiteUnlocked = false;
  if (videoEl) {
    videoEl.pause();
  }
  if (authLockScreen) {
    authLockScreen.style.display = 'flex';
    authLockScreen.classList.remove('unlocked');
  }
  if (authPasswordInput) {
    authPasswordInput.value = '';
    setTimeout(() => authPasswordInput.focus(), 80);
  }
  if (authErrorMsg) authErrorMsg.style.display = 'none';
  document.body.style.overflow = 'hidden';
}

// Initialize
async function init() {
  initAuth();
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

    // HTTPS Mixed Content detection
    if (window.location.protocol === 'https:') {
      const banner = document.getElementById('httpsWarningBanner');
      const closeBtn = document.getElementById('closeBannerBtn');
      const switchToHttpLink = document.getElementById('switchToHttpLink');
      if (banner && !sessionStorage.getItem('dismiss_https_banner')) {
        banner.style.display = 'flex';
        if (switchToHttpLink) {
          switchToHttpLink.href = 'http://' + window.location.host + window.location.pathname;
        }
        if (closeBtn) {
          closeBtn.addEventListener('click', () => {
            banner.style.display = 'none';
            sessionStorage.setItem('dismiss_https_banner', '1');
          });
        }
      }
    }

    buildSidebarFilters();
    applyFilters();

    // Auto-select a top Israeli or popular channel if available (only if unlocked)
    const initialCandidate = allChannels.find(c => c.country === 'IL' && c.name.includes('Kan 11')) ||
                             allChannels.find(c => c.country === 'IL') ||
                             allChannels[0];
    if (initialCandidate && isSiteUnlocked) {
      playChannel(initialCandidate);
    }
  } catch (err) {
    console.error('Initialization error:', err);
    gridLoading.innerHTML = `<p style="color:var(--danger)">שגיאה בטעינת הערוצים: ${err.message}</p>`;
  }
}

// Build Sidebar Filters
function buildSidebarFilters() {
  if (currentMode === 'movies') {
    const movieItems = allVodItems.filter(v => v.type === 'movie');
    const vodCategoryCounts = {};
    movieItems.forEach(item => {
      const cat = item.category || 'כללי';
      vodCategoryCounts[cat] = (vodCategoryCounts[cat] || 0) + 1;
    });

    countriesFilterCountEl.textContent = '1';
    countriesListEl.innerHTML = `
      <button class="filter-btn active" data-country="ALL">
        <span>🍿 כל הסרטים הישראליים</span>
        <span class="filter-badge">${movieItems.length}</span>
      </button>
    `;

    const sortedVodCats = Object.entries(vodCategoryCounts).sort((a, b) => b[1] - a[1]);
    categoriesFilterCountEl.textContent = sortedVodCats.length;

    let catHTML = `
      <button class="filter-btn ${selectedCategory === 'ALL' ? 'active' : ''}" data-category="ALL">
        <span>כל הז'אנרים</span>
        <span class="filter-badge">${movieItems.length}</span>
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

  if (currentMode === 'series') {
    const seriesItems = allVodItems.filter(v => v.type === 'series');
    const vodCategoryCounts = {};
    seriesItems.forEach(item => {
      const cat = item.category || 'כללי';
      vodCategoryCounts[cat] = (vodCategoryCounts[cat] || 0) + 1;
    });

    countriesFilterCountEl.textContent = '1';
    countriesListEl.innerHTML = `
      <button class="filter-btn active" data-country="ALL">
        <span>📺 כל הסדרות הישראליות</span>
        <span class="filter-badge">${seriesItems.length}</span>
      </button>
    `;

    const sortedVodCats = Object.entries(vodCategoryCounts).sort((a, b) => b[1] - a[1]);
    categoriesFilterCountEl.textContent = sortedVodCats.length;

    let catHTML = `
      <button class="filter-btn ${selectedCategory === 'ALL' ? 'active' : ''}" data-category="ALL">
        <span>כל הז'אנרים</span>
        <span class="filter-badge">${seriesItems.length}</span>
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

  // Top Countries - place IL and JP first, and ensure MX, PT and high-profile countries are always present
  const priorityCodes = ['IL', 'JP', 'MX', 'PT'];
  const remainingCountries = Object.entries(countryCounts)
    .filter(([code]) => !priorityCodes.includes(code))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40);

  const priorityList = priorityCodes
    .filter(code => countryCounts[code])
    .map(code => [code, countryCounts[code]]);

  const sortedCountries = [...priorityList, ...remainingCountries];

  countriesFilterCountEl.textContent = sortedCountries.length;

  let countriesHTML = `
    <button class="filter-btn ${selectedCountry === 'IL' ? 'active' : ''}" data-country="IL">
      <span>🇮🇱 ישראל</span>
      <span class="filter-badge">${countryCounts['IL'] || 0}</span>
    </button>
    <button class="filter-btn ${selectedCountry === 'JP' ? 'active' : ''}" data-country="JP">
      <span>🇯🇵 יפן</span>
      <span class="filter-badge">${countryCounts['JP'] || 0}</span>
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

  if (currentMode === 'movies' || currentMode === 'series') {
    const targetType = currentMode === 'movies' ? 'movie' : 'series';
    filteredVodItems = allVodItems.filter(item => {
      if (item.type !== targetType) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchCat = (item.category || '').toLowerCase().includes(q);
        const matchCast = (item.cast || '').toLowerCase().includes(q);
        const matchDesc = (item.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchCast && !matchDesc) return false;
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
  if (currentMode === 'movies') {
    let title = '🍿 סרטי קולנוע ישראליים';
    if (showFavoritesOnly) {
      title = '⭐ סרטים מועדפים';
    } else if (searchQuery) {
      title = `סרטים תואמים לחיפוש "${searchQuery}"`;
    } else if (selectedCategory !== 'ALL') {
      title = `סרטי ${selectedCategory}`;
    }
    viewHeading.textContent = title;
    totalMatchesCount.textContent = `${filteredVodItems.length.toLocaleString()} סרטים`;
    return;
  }

  if (currentMode === 'series') {
    let title = '📺 סדרות טלוויזיה ישראליות';
    if (showFavoritesOnly) {
      title = '⭐ סדרות מועדפות';
    } else if (searchQuery) {
      title = `סדרות תואמות לחיפוש "${searchQuery}"`;
    } else if (selectedCategory !== 'ALL') {
      title = `סדרות ${selectedCategory}`;
    }
    viewHeading.textContent = title;
    let epsSum = 0;
    filteredVodItems.forEach(s => epsSum += (s.episodes ? s.episodes.length : 0));
    totalMatchesCount.textContent = `${filteredVodItems.length.toLocaleString()} סדרות (${epsSum} פרקים)`;
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
  if (currentMode === 'movies' || currentMode === 'series' || currentMode === 'vod') {
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
          ${window.location.protocol === 'https:' && channel.url.startsWith('http://') ? `<span class="proto-tag" title="שידור HTTP - זמין בגרסת HTTP">HTTP</span>` : ''}
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
    const isSeries = item.type === 'series';
    const isActive = isSeries ? (currentSeries && currentSeries.id === item.id) : (currentVodItem && currentVodItem.id === item.id);
    const typeLabel = isSeries ? '📺 סדרה' : '🎬 סרט';
    const metaExtra = isSeries ? item.seasons : item.duration;
    const epCount = isSeries && item.episodes ? item.episodes.length : 0;

    html += `
      <div class="vod-card ${isActive ? 'active' : ''} ${isSeries ? 'series-card' : ''}" data-vod-id="${encodeURIComponent(item.id)}" data-type="${item.type}" data-url="${encodeURIComponent(item.streamUrl)}">
        <button class="card-fav-btn ${isFav ? 'is-fav' : ''}" data-fav-id="${encodeURIComponent(itemId)}" title="${isFav ? 'הסר ממועדפים' : 'הוסף למועדפים'}">
          ★
        </button>
        <button class="card-source-btn" data-url="${encodeURIComponent(item.streamUrl)}" data-name="${encodeURIComponent(item.title)}" title="הצג קישור מקור">
          🔗
        </button>
        <div class="vod-poster-wrapper">
          <img src="${item.poster}" class="vod-poster" alt="${item.title}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'%23374151\\'><rect width=\\'24\\' height=\\'24\\'/><text x=\\'50%\\' y=\\'50%\\' fill=\\'%239ca3af\\' font-size=\\'12\\' text-anchor=\\'middle\\' dy=\\'.3em\\'>${isSeries ? 'סדרה' : 'סרט'}</text></svg>'">
          <div class="vod-play-overlay">
            <div class="vod-play-icon">${isSeries ? '📋' : '▶'}</div>
          </div>
          <span class="vod-type-badge">${typeLabel}</span>
          ${isSeries ? `<span class="vod-episodes-badge">📋 ${epCount} פרקים</span>` : ''}
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

// Video Stream Engine helper (handles HLS m3u8 and direct MP4)
function playStreamSource(streamUrl, successMsg, channelObj = null) {
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }

  const isHls = streamUrl.includes('.m3u8') || (!streamUrl.endsWith('.mp4') && !videoEl.canPlayType('video/mp4'));

  if (isHls && Hls.isSupported()) {
    hlsInstance = new Hls({
      enableWorker: true,
      lowLatencyMode: !!channelObj,
      manifestLoadingMaxRetry: 3,
      levelLoadingMaxRetry: 3
    });

    hlsInstance.loadSource(streamUrl);
    hlsInstance.attachMedia(videoEl);

    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      videoEl.play().catch(e => console.warn('Autoplay prevented:', e));
      setStreamStatus('playing', successMsg || 'בשידור חי 🟢');
    });

    hlsInstance.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (window.location.protocol === 'https:' && streamUrl.startsWith('http://')) {
              setStreamStatus('error', 'נחסם ע"י הדפדפן (שידור ב-HTTP)');
              showToast('⚠️ ערוץ ב-HTTP: עבור לגרסת http://israel-global-tv.surge.sh כדי לצפות');
            } else {
              setStreamStatus('error', 'שגיאת רשת / הזרמה מוגנת');
              if (channelObj) markChannelDead(channelObj);
            }
            hlsInstance.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            setStreamStatus('error', 'משחזר שגיאת מדיה...');
            hlsInstance.recoverMediaError();
            break;
          default:
            setStreamStatus('error', 'ערוץ לא זמין כעת');
            if (channelObj) markChannelDead(channelObj);
            hlsInstance.destroy();
            break;
        }
      }
    });
  } else {
    // Native Apple HLS or direct MP4
    videoEl.src = streamUrl;
    videoEl.play().catch(e => console.warn('Autoplay prevented:', e));
    setStreamStatus('playing', successMsg || 'מנגן 🟢');
  }

  videoEl.onplaying = () => {
    setStreamStatus('playing', `${successMsg || 'מנגן'} 🟢`);
    if (channelObj) markChannelAlive(channelObj);
  };

  videoEl.onerror = () => {
    setStreamStatus('error', 'קובץ הווידאו אינו זמין כרגע');
    if (channelObj) markChannelDead(channelObj);
  };
}

// Live Channel Player
function playChannel(channel) {
  currentChannel = channel;
  currentVodItem = null;
  currentSeries = null;
  currentEpisode = null;

  placeholderEl.style.display = 'none';
  streamOverlayEl.style.display = 'flex';

  // Hide series episode controls in live mode
  if (overlayEpisodesBtn) overlayEpisodesBtn.style.display = 'none';
  if (overlayPrevEpBtn) overlayPrevEpBtn.style.display = 'none';
  if (overlayNextEpBtn) overlayNextEpBtn.style.display = 'none';

  overlayLogoEl.src = channel.logo || '';
  overlayNameEl.textContent = channel.name;
  overlayMetaEl.textContent = `${channel.flag || '🌐'} ${channel.countryName || channel.country} • ${channel.category || 'כללי'}`;

  const chId = channel.id || channel.url;
  overlayFavBtn.classList.toggle('is-fav', favorites.includes(chId));

  setStreamStatus('connecting', 'מתחבר לשידור...');

  // Highlight active channel card
  document.querySelectorAll('.channel-card').forEach(c => {
    c.classList.toggle('active', c.dataset.id === encodeURIComponent(chId));
  });

  playStreamSource(channel.url, 'שידור חי יציב', channel);
}

// Israeli Movie Player
function playMovie(movie) {
  if (!movie) return;
  currentVodItem = movie;
  currentSeries = null;
  currentEpisode = null;
  currentChannel = null;

  placeholderEl.style.display = 'none';
  streamOverlayEl.style.display = 'flex';

  // Hide series episode controls
  if (overlayEpisodesBtn) overlayEpisodesBtn.style.display = 'none';
  if (overlayPrevEpBtn) overlayPrevEpBtn.style.display = 'none';
  if (overlayNextEpBtn) overlayNextEpBtn.style.display = 'none';

  overlayLogoEl.src = movie.poster || '';
  overlayNameEl.textContent = movie.title;
  overlayMetaEl.textContent = `🎬 סרט ישראלי • ${movie.year || ''} • ${movie.duration || ''} • ${movie.category || ''}`;

  const itemId = movie.id || movie.streamUrl;
  overlayFavBtn.classList.toggle('is-fav', favorites.includes(itemId));

  setStreamStatus('connecting', 'טוען סרט...');

  // Highlight active card
  document.querySelectorAll('.vod-card').forEach(c => {
    c.classList.toggle('active', c.dataset.vodId === encodeURIComponent(movie.id));
  });

  playStreamSource(movie.streamUrl, 'מנגן סרט ישראלי 🎬');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast(`🎬 ${movie.title}`);
}

// Series Episode Player
function playSeriesEpisode(series, ep) {
  if (!series || !ep) return;
  currentSeries = series;
  currentEpisode = ep;
  currentVodItem = series;
  currentChannel = null;

  placeholderEl.style.display = 'none';
  streamOverlayEl.style.display = 'flex';

  overlayLogoEl.src = series.poster || '';
  overlayNameEl.textContent = `${series.title} • ${ep.title}`;
  const seasonStr = ep.season ? `עונה ${ep.season} • ` : '';
  const epNum = ep.number || ep.episode || '';
  overlayMetaEl.textContent = `📺 ${seasonStr}פרק ${epNum} • ${ep.duration || ''} • ${series.category || 'סדרה'}`;

  overlayFavBtn.classList.toggle('is-fav', favorites.includes(series.id));

  // Show episode navigation in overlay
  if (overlayEpisodesBtn) overlayEpisodesBtn.style.display = 'inline-flex';
  if (overlayPrevEpBtn) overlayPrevEpBtn.style.display = 'inline-flex';
  if (overlayNextEpBtn) overlayNextEpBtn.style.display = 'inline-flex';

  // Update prev / next disabled states
  const episodes = series.episodes || [];
  const epIdx = episodes.findIndex(e => (e.id && e.id === ep.id) || e.streamUrl === ep.streamUrl);
  if (overlayPrevEpBtn) overlayPrevEpBtn.disabled = epIdx <= 0;
  if (overlayNextEpBtn) overlayNextEpBtn.disabled = epIdx < 0 || epIdx >= episodes.length - 1;

  // Highlight card in grid
  document.querySelectorAll('.vod-card').forEach(c => {
    c.classList.toggle('active', c.dataset.vodId === encodeURIComponent(series.id));
  });

  // Highlight in episodes grid if open
  document.querySelectorAll('.episode-card').forEach(card => {
    const isThis = card.dataset.epId === String(ep.id);
    card.classList.toggle('active', isThis);
    const playBtn = card.querySelector('.ep-play-btn');
    if (playBtn) playBtn.textContent = isThis ? '🟢 מנגן כעת' : '▶ צפה בפרק';
  });

  setStreamStatus('connecting', `טוען ${ep.title}...`);
  playStreamSource(ep.streamUrl, 'מנגן פרק סדרה 📺');

  // Close modal so user sees video immediately
  closeSeriesModal();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast(`📺 ${series.title}: ${ep.title}`);
}

// Next / Previous Episode Navigation
function playNextEpisode() {
  if (!currentSeries || !currentSeries.episodes || currentSeries.episodes.length === 0) return;
  const episodes = currentSeries.episodes;
  const currentIdx = episodes.findIndex(e => currentEpisode && ((e.id && e.id === currentEpisode.id) || e.streamUrl === currentEpisode.streamUrl));
  const nextIdx = currentIdx + 1;
  if (nextIdx < episodes.length) {
    playSeriesEpisode(currentSeries, episodes[nextIdx]);
  } else {
    showToast('זהו הפרק האחרון בסדרה');
  }
}

function playPrevEpisode() {
  if (!currentSeries || !currentSeries.episodes || currentSeries.episodes.length === 0) return;
  const episodes = currentSeries.episodes;
  const currentIdx = episodes.findIndex(e => currentEpisode && ((e.id && e.id === currentEpisode.id) || e.streamUrl === currentEpisode.streamUrl));
  const prevIdx = currentIdx - 1;
  if (prevIdx >= 0) {
    playSeriesEpisode(currentSeries, episodes[prevIdx]);
  } else {
    showToast('זהו הפרק הראשון בסדרה');
  }
}

// Series Details Modal (Backdrop, Synopsis, Seasons, Episodes)
function openSeriesModal(series) {
  if (!series) return;
  currentSeries = series;
  selectedSeason = 'ALL';

  if (seriesBackdropImg) {
    seriesBackdropImg.src = series.backdrop || series.poster || '';
    seriesBackdropImg.onerror = () => {
      seriesBackdropImg.src = series.poster || '';
    };
  }

  if (seriesModalPoster) seriesModalPoster.src = series.poster || '';
  if (seriesModalTitle) seriesModalTitle.textContent = series.title;
  if (seriesModalDesc) seriesModalDesc.textContent = series.description || '';
  if (seriesModalCast) seriesModalCast.innerHTML = series.cast ? `<strong>שחקנים:</strong> ${series.cast}` : '';
  if (seriesModalCategory) seriesModalCategory.textContent = series.category || 'סדרה';
  if (seriesModalYear) seriesModalYear.textContent = series.year || '';
  if (seriesModalSeasons) seriesModalSeasons.textContent = series.seasons || '';

  const isFav = favorites.includes(series.id);
  if (seriesFavBtn) {
    seriesFavBtn.classList.toggle('is-fav', isFav);
    seriesFavBtn.textContent = isFav ? '★ במועדפים' : '☆ הוסף למועדפים';
  }

  const episodes = series.episodes || [];
  if (seriesEpTotalBadge) seriesEpTotalBadge.textContent = `${episodes.length} פרקים`;

  // Build Season selector tabs
  buildSeriesSeasonsBar(series);

  // Render episodes grid
  renderEpisodesGrid(series, episodes);

  if (seriesModal) {
    seriesModal.style.display = 'flex';
    seriesModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
}

function closeSeriesModal() {
  if (seriesModal) {
    seriesModal.style.display = 'none';
    seriesModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

function buildSeriesSeasonsBar(series) {
  if (!seriesSeasonsBar) return;
  const episodes = series.episodes || [];
  const seasonsSet = new Set();
  episodes.forEach(ep => {
    if (ep.season) seasonsSet.add(ep.season);
  });
  const seasons = Array.from(seasonsSet).sort((a, b) => a - b);

  if (seasons.length <= 1) {
    seriesSeasonsBar.innerHTML = `
      <button class="season-btn active" data-season="ALL">
        <span>כל הפרקים (${episodes.length})</span>
      </button>
    `;
    return;
  }

  let html = `
    <button class="season-btn ${selectedSeason === 'ALL' ? 'active' : ''}" data-season="ALL">
      <span>כל העונות (${episodes.length})</span>
    </button>
  `;

  seasons.forEach(s => {
    const sEpsCount = episodes.filter(ep => ep.season === s).length;
    html += `
      <button class="season-btn ${selectedSeason == s ? 'active' : ''}" data-season="${s}">
        <span>עונה ${s} (${sEpsCount})</span>
      </button>
    `;
  });

  seriesSeasonsBar.innerHTML = html;
}

function renderEpisodesGrid(series, episodesList) {
  if (!episodesGrid) return;
  if (!episodesList || episodesList.length === 0) {
    episodesGrid.innerHTML = `
      <div style="grid-column: 1/-1; padding: 2rem; text-align: center; color: var(--text-muted);">
        לא נמצאו פרקים בעונה שנבחרה.
      </div>
    `;
    return;
  }

  let html = '';
  episodesList.forEach((ep, idx) => {
    const isPlaying = currentEpisode && ((ep.id && currentEpisode.id === ep.id) || currentEpisode.streamUrl === ep.streamUrl);
    const epNum = ep.number || ep.episode || (idx + 1);
    const seasonLabel = ep.season ? `עונה ${ep.season} • ` : '';

    html += `
      <div class="episode-card ${isPlaying ? 'active' : ''}" data-ep-idx="${idx}" data-ep-id="${ep.id || idx}">
        <div class="ep-card-top">
          <span class="ep-number-badge">${seasonLabel}פרק ${epNum}</span>
          <span class="ep-duration">⏱ ${ep.duration || '25 דק\''}</span>
        </div>
        <div class="ep-card-title" title="${ep.title}">${ep.title}</div>
        <div class="ep-card-bottom">
          <span class="ep-play-btn">${isPlaying ? '🟢 מנגן כעת' : '▶ צפה בפרק'}</span>
        </div>
      </div>
    `;
  });

  episodesGrid.innerHTML = html;
}

// Legacy VOD wrapper
function playVodItem(item) {
  if (!item) return;
  if (item.type === 'series') {
    openSeriesModal(item);
  } else {
    playMovie(item);
  }
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

  // Next / Previous Navigation (Handles series episodes, movies, and live TV channels)
  function playNextChannel() {
    if (currentSeries && currentEpisode) {
      playNextEpisode();
      return;
    }

    if (currentMode === 'movies') {
      if (filteredVodItems.length === 0) return;
      const currentIdx = filteredVodItems.findIndex(v => currentVodItem && v.id === currentVodItem.id);
      const nextIdx = (currentIdx + 1) % filteredVodItems.length;
      playMovie(filteredVodItems[nextIdx]);
      return;
    }

    if (currentMode === 'series') {
      if (filteredVodItems.length === 0) return;
      const currentIdx = filteredVodItems.findIndex(v => currentSeries && v.id === currentSeries.id);
      const nextIdx = (currentIdx + 1) % filteredVodItems.length;
      openSeriesModal(filteredVodItems[nextIdx]);
      return;
    }

    if (filteredChannels.length === 0) return;
    const currentIdx = filteredChannels.findIndex(c => currentChannel && (c.id === currentChannel.id || c.url === currentChannel.url));
    const nextIdx = (currentIdx + 1) % filteredChannels.length;
    playChannel(filteredChannels[nextIdx]);
    showToast(`📺 ${filteredChannels[nextIdx].name}`);
  }

  function playPrevChannel() {
    if (currentSeries && currentEpisode) {
      playPrevEpisode();
      return;
    }

    if (currentMode === 'movies') {
      if (filteredVodItems.length === 0) return;
      const currentIdx = filteredVodItems.findIndex(v => currentVodItem && v.id === currentVodItem.id);
      const prevIdx = (currentIdx - 1 + filteredVodItems.length) % filteredVodItems.length;
      playMovie(filteredVodItems[prevIdx]);
      return;
    }

    if (currentMode === 'series') {
      if (filteredVodItems.length === 0) return;
      const currentIdx = filteredVodItems.findIndex(v => currentSeries && v.id === currentSeries.id);
      const prevIdx = (currentIdx - 1 + filteredVodItems.length) % filteredVodItems.length;
      openSeriesModal(filteredVodItems[prevIdx]);
      return;
    }

    if (filteredChannels.length === 0) return;
    const currentIdx = filteredChannels.findIndex(c => currentChannel && (c.id === currentChannel.id || c.url === currentChannel.url));
    const prevIdx = (currentIdx - 1 + filteredChannels.length) % filteredChannels.length;
    playChannel(filteredChannels[prevIdx]);
    showToast(`📺 ${filteredChannels[prevIdx].name}`);
  }

  // Keyboard shortcut listener: 'F' for fullscreen, ArrowLeft/ArrowRight or [/] for next/prev, Esc to close modals
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'Escape') {
      if (seriesModal && seriesModal.style.display !== 'none') {
        closeSeriesModal();
      }
      if (sourceModal && sourceModal.style.display !== 'none') {
        closeSourceModal();
      }
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      toggleFullscreen();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageDown' || e.key === ']') {
      // In RTL (Hebrew interface), Next channel/episode is Left arrow
      e.preventDefault();
      playNextChannel();
    } else if (e.key === 'ArrowRight' || e.key === 'PageUp' || e.key === '[') {
      // Previous channel/episode is Right arrow
      e.preventDefault();
      playPrevChannel();
    }
  });

  // Desktop Floating Mini-Player (PiP): shrinks to bottom-right when scrolling down, returns when at top
  function handleDesktopPiPScroll() {
    // Only activate PiP on desktop / laptop screens (width > 820px)
    if (window.innerWidth <= 820) {
      if (playerPanel.classList.contains('pip-mode')) {
        playerPanel.classList.remove('pip-mode');
        if (playerPipPlaceholder) playerPipPlaceholder.classList.remove('active');
      }
      return;
    }

    // Measure scroll distance across window, documentElement and body
    const scrollPos = Math.max(
      window.scrollY || 0,
      document.documentElement.scrollTop || 0,
      document.body.scrollTop || 0,
      (browsePanel ? browsePanel.scrollTop : 0)
    );

    const triggerThreshold = 140; // Pixels scrolled before shrinking to bottom right

    if (scrollPos > triggerThreshold) {
      if (!playerPanel.classList.contains('pip-mode')) {
        playerPanel.classList.add('pip-mode');
        if (playerPipPlaceholder) playerPipPlaceholder.classList.add('active');
      }
    } else {
      if (playerPanel.classList.contains('pip-mode')) {
        playerPanel.classList.remove('pip-mode');
        if (playerPipPlaceholder) playerPipPlaceholder.classList.remove('active');
      }
    }
  }

  // Restore player to top on click on placeholder or restore button
  if (playerPipPlaceholder) {
    playerPipPlaceholder.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
      if (browsePanel) browsePanel.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (pipRestoreBtn) {
    pipRestoreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
      if (browsePanel) browsePanel.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  window.addEventListener('scroll', handleDesktopPiPScroll, { passive: true });
  document.addEventListener('scroll', handleDesktopPiPScroll, { passive: true });
  if (browsePanel) {
    browsePanel.addEventListener('scroll', handleDesktopPiPScroll, { passive: true });
  }
  window.addEventListener('resize', handleDesktopPiPScroll, { passive: true });

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

  // Mode Switching (Live TV, Movies, Series)
  function switchMode(mode) {
    if (currentMode === mode) return;
    currentMode = mode;

    if (liveModeBtn) liveModeBtn.classList.toggle('active', mode === 'live');
    if (moviesModeBtn) moviesModeBtn.classList.toggle('active', mode === 'movies');
    if (seriesModeBtn) seriesModeBtn.classList.toggle('active', mode === 'series');
    if (vodModeBtn) vodModeBtn.classList.toggle('active', mode === 'vod');

    const isLive = mode === 'live';
    if (quickCountriesBar && quickCountriesBar.parentElement) {
      quickCountriesBar.parentElement.style.display = isLive ? 'block' : 'none';
    }
    if (checkActiveChannelsBtn) {
      checkActiveChannelsBtn.style.display = isLive ? 'inline-flex' : 'none';
    }

    selectedCountry = isLive ? 'IL' : 'ALL';
    selectedCategory = 'ALL';
    searchQuery = '';
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';

    if (mode === 'live') {
      searchInput.placeholder = 'חפש ערוץ, מדינה או תחום (למשל: ספורט, ישראל, BBC, חדשות)...';
    } else if (mode === 'movies') {
      searchInput.placeholder = 'חפש סרט ישראלי, שחקנים או ז\'אנר (למשל: מבצע סבתא, קומדיה)...';
    } else if (mode === 'series') {
      searchInput.placeholder = 'חפש סדרה, עונה או שחקנים (למשל: קופה ראשית, עספור, הפיג\'מות)...';
    }

    buildSidebarFilters();
    applyFilters();
  }

  if (liveModeBtn) {
    liveModeBtn.addEventListener('click', () => switchMode('live'));
  }
  if (moviesModeBtn) {
    moviesModeBtn.addEventListener('click', () => switchMode('movies'));
  }
  if (seriesModeBtn) {
    seriesModeBtn.addEventListener('click', () => switchMode('series'));
  }
  if (vodModeBtn) {
    vodModeBtn.addEventListener('click', () => switchMode('movies'));
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

    // VOD Card Click (Movies & Series)
    const vodCard = e.target.closest('.vod-card');
    if (vodCard) {
      const vodId = decodeURIComponent(vodCard.dataset.vodId);
      const item = allVodItems.find(v => v.id === vodId);
      if (item) {
        if (item.type === 'series') {
          openSeriesModal(item);
        } else {
          playMovie(item);
        }
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

  // Series Details Modal Listeners
  if (closeSeriesModalBtn) {
    closeSeriesModalBtn.addEventListener('click', closeSeriesModal);
  }

  if (seriesModal) {
    seriesModal.addEventListener('click', (e) => {
      if (e.target === seriesModal) {
        closeSeriesModal();
      }
    });
  }

  if (seriesPlayFirstBtn) {
    seriesPlayFirstBtn.addEventListener('click', () => {
      if (!currentSeries || !currentSeries.episodes || currentSeries.episodes.length === 0) return;
      playSeriesEpisode(currentSeries, currentSeries.episodes[0]);
    });
  }

  if (seriesFavBtn) {
    seriesFavBtn.addEventListener('click', () => {
      if (!currentSeries) return;
      toggleFavorite(currentSeries.id);
      const isFav = favorites.includes(currentSeries.id);
      seriesFavBtn.classList.toggle('is-fav', isFav);
      seriesFavBtn.textContent = isFav ? '★ במועדפים' : '☆ הוסף למועדפים';
    });
  }

  if (seriesSeasonsBar) {
    seriesSeasonsBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.season-btn');
      if (!btn || !currentSeries) return;

      seriesSeasonsBar.querySelectorAll('.season-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      selectedSeason = btn.dataset.season;
      let filtered = currentSeries.episodes || [];
      if (selectedSeason !== 'ALL') {
        filtered = filtered.filter(ep => String(ep.season) === String(selectedSeason));
      }
      renderEpisodesGrid(currentSeries, filtered);
    });
  }

  if (episodesGrid) {
    episodesGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.episode-card');
      if (!card || !currentSeries) return;
      const epId = card.dataset.epId;
      const ep = (currentSeries.episodes || []).find(e => String(e.id || '') === String(epId)) ||
                 (currentSeries.episodes || [])[parseInt(card.dataset.epIdx, 10)];
      if (ep) {
        playSeriesEpisode(currentSeries, ep);
      }
    });
  }

  // Player Overlay Series Controls
  if (overlayEpisodesBtn) {
    overlayEpisodesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentSeries) {
        openSeriesModal(currentSeries);
      }
    });
  }

  if (overlayPrevEpBtn) {
    overlayPrevEpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playPrevEpisode();
    });
  }

  if (overlayNextEpBtn) {
    overlayNextEpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playNextEpisode();
    });
  }

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
