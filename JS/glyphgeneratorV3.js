const validPortalKeys = '0123456789ABCDEF';

const wikiLink = 'https://nomanssky.fandom.com/wiki/';
const apiPath = 'https://nomanssky.fandom.com/api.php';

const CIVILIZATIONS_CACHE_KEY = 'nms_civilizations_cache';
const REGIONS_CACHE_KEY = 'nms_regions_cache';
const OFFSET_CACHE_KEY = 'nms_offset_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const requestQueue = [];
let isProcessing = false;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 35000;

const ESTIMATED_TOTAL_ITEMS = 7500;
const ITEMS_PER_REQUEST = 500;
let validItemsProcessed = 0;

const loadDefaultData = async () => {
  try {
    const response = await fetch("../public/assets/defaultData/defaultData.json");
    if (!response.ok) throw new Error("Could not load defaultData.json");
    const data = await response.json();

    const existing = getCachedData(CIVILIZATIONS_CACHE_KEY);
    if (!existing) {
      console.log("Loading default data into the cache...");
      setCachedData(CIVILIZATIONS_CACHE_KEY, data);
    }

    return data;
  } catch (error) {
    console.error("Error loading default data:", error);
    return null;
  }
};

const updateProgressBar = (current, total, startTime) => {
  const progressContainer = document.getElementById('progressBarContainer');
  const progressFill = document.getElementById('progressBarFill');
  const progressPercentage = document.getElementById('progressPercentage');
  const progressInfo = document.getElementById('progressInfo');
  const timeEstimate = document.getElementById('timeEstimate');

  if (!progressContainer || !progressFill) return;

  progressContainer.style.display = 'block';

  const percentage = Math.min(Math.round((current / total) * 100), 100);
  progressFill.style.width = `${percentage}%`;
  progressPercentage.textContent = `${percentage}%`;
  progressInfo.textContent = `${current.toLocaleString()} / ${total.toLocaleString()}`;

  const elapsed = Date.now() - startTime;
  const itemsProcessed = current;
  const itemsRemaining = total - current;

  if (itemsProcessed > 0 && itemsRemaining > 0) {
    const avgTimePerItem = elapsed / itemsProcessed;
    const estimatedTimeRemaining = (avgTimePerItem * itemsRemaining) / 1000;

    const minutes = Math.floor(estimatedTimeRemaining / 60);
    const seconds = Math.round(estimatedTimeRemaining % 60);

    if (minutes > 0) {
      timeEstimate.textContent = i18next.t('estimatedTime', { minutes, seconds });
    } else {
      timeEstimate.textContent = i18next.t('estimatedTimeSeconds', { seconds });
    }
  } else if (itemsRemaining === 0) {
    timeEstimate.textContent = i18next.t('complete');
  }
};

const hideProgressBar = () => {
  const progressContainer = document.getElementById('progressBarContainer');
  if (progressContainer) {
    setTimeout(() => {
      progressContainer.style.display = 'none';
    }, 1000);
  }
};

const processQueue = async () => {
  if (isProcessing || requestQueue.length === 0) return;

  isProcessing = true;

  while (requestQueue.length > 0) {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve =>
        setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
      );
    }

    const { fn, resolve, reject } = requestQueue.shift();

    try {
      lastRequestTime = Date.now();
      const result = await fn();
      resolve(result);
    } catch (error) {
      console.error('Request failed:', error);
      reject(error);
    }
  }

  isProcessing = false;
};

const enqueueRequest = (fn) => {
  return new Promise((resolve, reject) => {
    requestQueue.push({ fn, resolve, reject });
    processQueue();
  });
};

const getCachedData = (key) => {
  const cached = localStorage.getItem(key);
  if (!cached) return null;

  try {
    const { data, timestamp } = JSON.parse(cached);
    // if (Date.now() - timestamp > CACHE_DURATION) {
    //   if (key === CIVILIZATIONS_CACHE_KEY) {
    //     localStorage.removeItem(OFFSET_CACHE_KEY);
    //   }
    //   localStorage.removeItem(key);
    //   return null;
    // }
    return data;
  } catch (e) {
    console.error('Error parsing cache:', e);
    localStorage.removeItem(key);
    if (key === CIVILIZATIONS_CACHE_KEY) {
      localStorage.removeItem(OFFSET_CACHE_KEY);
    }
    return null;
  }
};

const setCachedData = (key, data) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (e) {
    console.error('Error setting cache:', e);
  }
};

const getCachedOffset = () => {
  const cached = localStorage.getItem(OFFSET_CACHE_KEY);
  if (!cached) return 0;

  try {
    const { offset, timestamp } = JSON.parse(cached);
    return offset || 0;
  } catch (e) {
    console.error('Error parsing offset cache:', e);
    return 0;
  }
};

const setCachedOffset = (offset) => {
  try {
    const cacheData = {
      offset,
      timestamp: Date.now()
    };
    localStorage.setItem(OFFSET_CACHE_KEY, JSON.stringify(cacheData));
  } catch (e) {
    console.error('Error setting offset cache:', e);
  }
};

const resetOffsetCache = () => {
  localStorage.removeItem(OFFSET_CACHE_KEY);
};

const clearPartialCache = () => {
  localStorage.removeItem('nms_partial_civilizations_cache');
};

const filterValidData = (data) => {
  return data.filter(item =>
    item.title.civilizeD &&
    item.title.civilizeD !== 'Uncharted' &&
    item.title.coordinateS &&
    item.title.galaxY &&
    item.title.pageName
  );
};

const fetchCivilizationsPage = async (offset = 0) => {
  const params = new URLSearchParams();
  params.append('action', 'cargoquery');
  params.append('tables', 'Regions');
  params.append('fields', 'Regions.Civilized=civilizeD,Regions.Galaxy=galaxY,Regions.Coordinates=coordinateS,_pageName=pageName');
  params.append('group_by', '_pageName');
  params.append('order_by', '_pageName');
  params.append('limit', '500');
  params.append('offset', offset.toString());
  params.append('format', 'json');
  params.append('origin', '*');

  const url = `${apiPath}?${params.toString()}`;
  console.log(url)
  console.log(`Fetching page with offset: ${offset}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.cargoquery || [];
};

const fetchAllCivilizationsAndRegions = async () => {
  return enqueueRequest(async () => {
    const cached = getCachedData(CIVILIZATIONS_CACHE_KEY);
    if (cached) {
      console.log('Using cached civilizations data');
      hideProgressBar();
      return cached;
    }
    console.log('Fetching fresh civilizations data with pagination');
    let allData = [];
    let offset = getCachedOffset();
    let hasMore = true;
    let requestCount = 0;
    const maxRequestsPerSession = Infinity;
    const minValidDataThreshold = 50;
    const startTime = Date.now();
    console.log(`Starting from cached offset: ${offset}`);

    const partialCached = getCachedData('nms_partial_civilizations_cache');
    if (partialCached) {
      allData = partialCached.data || [];
      offset = partialCached.offset || 0;
      console.log(`Resuming from partial cache with ${allData.length} items and offset ${offset}`);
    }

    while (hasMore && requestCount < maxRequestsPerSession) {
      try {
        const pageData = await fetchCivilizationsPage(offset);
        const validPageData = filterValidData(pageData);
        validItemsProcessed += validPageData.length;
        console.log(`Page ${requestCount + 1}: ${pageData.length} raw items, ${validPageData.length} valid items`);

        if (pageData.length === 0) {
          hasMore = false;
          console.log('No more data available');
        } else {
          allData = allData.concat(validPageData);
          requestCount++;

          const partialCacheData = {
            data: allData,
            offset: offset + 500,
            timestamp: Date.now()
          };
          setCachedData('nms_partial_civilizations_cache', partialCacheData);

          console.log(`Total valid items so far: ${allData.length}`);
          if (pageData.length < 50) {
            hasMore = false;
            console.log('Last page reached (less than 50 raw items)');
          } else {
            offset += 500;
            updateProgressBar(offset, ESTIMATED_TOTAL_ITEMS, startTime);
            setCachedOffset(offset);
            console.log(`Next offset saved to cache: ${offset}`);
          }
          if (hasMore) {
            console.log('Waiting before next request...');
            await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL));
          }
        }
      } catch (error) {
        console.error('Error fetching page:', error);
        console.log(`Stopping due to error. Current offset: ${offset}`);
        hasMore = false;
      }
    }

    console.log(`Total valid items fetched: ${allData.length}`);
    if (!hasMore) {
      resetOffsetCache();
      localStorage.removeItem('nms_partial_civilizations_cache');
      updateProgressBar(ESTIMATED_TOTAL_ITEMS, ESTIMATED_TOTAL_ITEMS, startTime);
      console.log('All data fetched, offset cache reset');
      setTimeout(hideProgressBar, 1500);
    }

    if (allData.length > 0) {
      const galaxies = [...new Set(
        allData.map(item => item.title.galaxY)
      )].filter(Boolean).sort();
      const data = {};
      galaxies.forEach(galaxy => {
        data[galaxy] = {
          civilizations: [],
          regions: {}
        };
        const galaxyData = allData.filter(item => item.title.galaxY === galaxy);
        const civilizations = [...new Set(
          galaxyData.map(item => item.title.civilizeD)
        )].sort();
        data[galaxy].civilizations = civilizations;
        civilizations.forEach(civ => {
          data[galaxy].regions[civ] = galaxyData
            .filter(item => item.title.civilizeD === civ)
            .map(item => ({
              name: item.title.pageName,
              coordinates: item.title.coordinateS,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
        });
      });
      const result = { galaxies, data };
      if (!hasMore) {
        setCachedData(CIVILIZATIONS_CACHE_KEY, result);
        console.log('Civilizations data cached successfully');
      } else {
        console.log('Data not cached yet - more pages to fetch');
      }
      return result;
    } else {
      hideProgressBar();
      throw new Error('No valid data could be fetched');
    }
  });
};

function glyphInputOnChange(input) {
  let newValue = input.value.toUpperCase();
  input.value = validateGlyphInput(newValue);
}

function validateGlyphInput(glyphString) {
  const formattedString = glyphString
    .split('')
    .filter(char => validPortalKeys.includes(char))
    .join('');
  return formattedString.substring(0, 12);
}

const randomGlyph = () => {
  return validPortalKeys[Math.floor(Math.random() * validPortalKeys.length)];
};

const generateGlyphs = () => {
  const regionInput = document.getElementById("regionInput").value.trim().toUpperCase();
  let glyphs = "0";

  for (let i = 1; i <= 3; i++) {
    glyphs += randomGlyph();
  }

  if (regionInput.length >= 12) {
    for (let i = 4; i < 12; i++) {
      if (validPortalKeys.includes(regionInput[i])) {
        glyphs += regionInput[i];
      } else {
        return "";
      }
    }
  } else if (regionInput.length > 0 && regionInput.length < 12) {
    for (let i = 0; i < 8; i++) {
      glyphs += randomGlyph();
    }
    showNotification(i18next.t("fullportalcode"), "error");
  } else {
    for (let i = 0; i < 8; i++) {
      glyphs += randomGlyph();
    }
  }

  while (glyphs.length < 12) {
    glyphs += randomGlyph();
  }

  return glyphs;
};

const displayRandomGlyphs = () => {
  const generateButton = document.getElementById("generateButton");
  const copyButton = document.getElementById("copyButton");
  const glyphOutput = document.getElementById("glyphOutput");
  const glyphOutputHex = document.getElementById("glyphOutputHex");
  const glyphOutputContainer = document.getElementById("glyphOutputContainer");

  generateButton.disabled = true;
  copyButton.disabled = true;

  const glyphs = generateGlyphs();

  if (!glyphs) {
    generateButton.disabled = false;
    return;
  }

  glyphOutputContainer.classList.add("show");

  const portalCodeText = i18next.t("portalCode");

  glyphOutput.innerHTML = glyphs.split("").map((_, i) =>
    `<span id="glyph${i}"></span>`
  ).join("");

  glyphOutputHex.innerHTML = `
        <span class="portal-label">${portalCodeText}</span>
        ${glyphs.split("").map((_, i) =>
    `<span id="glyphHex${i}"></span>`
  ).join("")}
      `;

  glyphs.split("").forEach((glyph, i) => {
    setTimeout(() => {
      const glyphElement = document.getElementById(`glyph${i}`);
      glyphElement.classList.add("spin");

      const intervalId = setInterval(() => {
        glyphElement.textContent = randomGlyph();
      }, 80);

      setTimeout(() => {
        clearInterval(intervalId);
        glyphElement.textContent = glyph;
        glyphElement.classList.remove("spin");

        if (i === glyphs.length - 1) {
          generateButton.disabled = false;
          copyButton.disabled = false;
        }
      }, 800);
    }, i * 100);

    setTimeout(() => {
      const glyphHexElement = document.getElementById(`glyphHex${i}`);
      glyphHexElement.classList.add("spin");

      const intervalIdHex = setInterval(() => {
        glyphHexElement.textContent = randomGlyph();
      }, 80);

      setTimeout(() => {
        clearInterval(intervalIdHex);
        glyphHexElement.textContent = glyph;
        glyphHexElement.classList.remove("spin");
      }, 800);
    }, i * 100);
  });

  copyButton.dataset.clipboard = glyphs;
};

const coords2Glyphs = (coordinates) => {
  if (!coordinates || typeof coordinates !== 'string') return '';
  const parts = coordinates.split(':');
  if (parts.length !== 4) return '';
  const [xStr, yStr, zStr] = parts;
  const coords_x = parseInt(xStr, 16);
  const coords_y = parseInt(yStr, 16);
  const coords_z = parseInt(zStr, 16);
  const system_idx = '000';
  const X_Z_POS_SHIFT = 2049;
  const X_Z_NEG_SHIFT = 2047;
  const Y_POS_SHIFT = 129;
  const Y_NEG_SHIFT = 127;
  const x_glyph = coords_x <= 2046 ? coords_x + X_Z_POS_SHIFT : coords_x - X_Z_NEG_SHIFT;
  const z_glyph = coords_z <= 2046 ? coords_z + X_Z_POS_SHIFT : coords_z - X_Z_NEG_SHIFT;
  const y_glyph = coords_y <= 126 ? coords_y + Y_POS_SHIFT : coords_y - Y_NEG_SHIFT;
  const xGlyphHex = x_glyph.toString(16).toUpperCase().padStart(3, '0');
  const yGlyphHex = y_glyph.toString(16).toUpperCase().padStart(2, '0');
  const zGlyphHex = z_glyph.toString(16).toUpperCase().padStart(3, '0');
  const prefix = '0';
  return prefix + system_idx + yGlyphHex + zGlyphHex + xGlyphHex;
};

const copyToClipboard = () => {
  const copyButton = document.getElementById("copyButton");
  const textToCopy = copyButton.dataset.clipboard;

  navigator.clipboard.writeText(textToCopy).then(
    () => {
      showNotification(i18next.t("copiedSuccess"), "success");
    },
    () => {
      showNotification(i18next.t("copiedFail"), "error");
    }
  );
};

const showNotification = (message, type) => {
  let notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("show");
  }, 10);

  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 3000);
};

function mergeCivilizationData(oldData, newData) {
  const merged = JSON.parse(JSON.stringify(oldData));

  for (const galaxy of newData.galaxies) {
    if (!merged.galaxies.includes(galaxy)) {
      merged.galaxies.push(galaxy);
    }
  }

  for (const [galaxyName, galaxyInfo] of Object.entries(newData.data)) {
    if (!merged.data[galaxyName]) {
      merged.data[galaxyName] = galaxyInfo;
      continue;
    }

    const oldGalaxy = merged.data[galaxyName];

    for (const civ of galaxyInfo.civilizations) {
      if (!oldGalaxy.civilizations.includes(civ)) {
        oldGalaxy.civilizations.push(civ);
      }
    }

    for (const civ of galaxyInfo.civilizations) {
      if (!oldGalaxy.regions[civ]) {
        oldGalaxy.regions[civ] = galaxyInfo.regions[civ];
        continue;
      }

      const oldRegions = oldGalaxy.regions[civ];
      const newRegions = galaxyInfo.regions[civ];

      for (const r of newRegions) {
        if (!oldRegions.some(or => or.name === r.name)) {
          oldRegions.push(r);
        }
      }
    }
  }

  return merged;
}

const forceRefreshCivilizations = async () => {
  console.log("🔄 Forzando actualización y merge de datos…");
  showNotification(i18next.t("updatingInfo"), "info");

  const defaultData = await loadDefaultData();

  const freshData = await fetchAllCivilizationsAndRegions(true);
  const merged = mergeCivilizationData(defaultData, freshData);

  setCachedData(CIVILIZATIONS_CACHE_KEY, merged);

  console.log("✅ Merge completado. JSON actualizado sin borrar datos.");
  showNotification(i18next.t("updatingFinish"), "success");

  return merged;
};

window.forceRefreshCivilizations = forceRefreshCivilizations;

const populateGalaxySelect = async () => {
  const select = document.getElementById("galaxySelect");
  const loadingOption = document.createElement("option");
  loadingOption.value = "";
  loadingOption.textContent = i18next.t("loadingGalaxies");
  loadingOption.disabled = true;
  select.innerHTML = "";
  select.appendChild(loadingOption);

  try {
    const { galaxies } = await fetchAllCivilizationsAndRegions();
    select.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = i18next.t("selectGalaxy");
    select.appendChild(defaultOption);

    galaxies.forEach(galaxy => {
      const option = document.createElement("option");
      option.value = galaxy;
      option.textContent = galaxy;
      select.appendChild(option);
    });

    select.disabled = false;
    initializeChoices();
  } catch (error) {
    const errorOption = document.createElement("option");
    errorOption.value = "";
    errorOption.textContent = i18next.t("loadError");
    select.innerHTML = "";
    select.appendChild(errorOption);
    select.disabled = true;
  }
};

const populateCivilizationSelect = async (galaxy) => {
  const select = document.getElementById("civilizationSelect");

  if (!galaxy) {
    select.innerHTML = "";
    select.disabled = true;
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = i18next.t("selectGalaxyFirst");
    select.appendChild(defaultOption);

    const regionSelect = document.getElementById("regionSelect");
    regionSelect.innerHTML = "";
    regionSelect.disabled = true;
    const regionOption = document.createElement("option");
    regionOption.value = "";
    regionOption.textContent = i18next.t("selectGalaxyFirst");
    regionSelect.appendChild(regionOption);
    return;
  }

  const loadingOption = document.createElement("option");
  loadingOption.value = "";
  loadingOption.textContent = i18next.t("loadingCivilizations");
  loadingOption.disabled = true;
  select.innerHTML = "";
  select.appendChild(loadingOption);

  try {
    const cached = getCachedData(CIVILIZATIONS_CACHE_KEY);
    if (cached && cached.data[galaxy]) {
      const civilizations = cached.data[galaxy].civilizations;
      select.innerHTML = "";
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = i18next.t("selectCivilization");
      select.appendChild(defaultOption);

      civilizations.forEach(civ => {
        const option = document.createElement("option");
        option.value = civ;
        option.textContent = civ;
        select.appendChild(option);
      });

      select.disabled = false;
      initializeChoices();
    }
  } catch (error) {
    const errorOption = document.createElement("option");
    errorOption.value = "";
    errorOption.textContent = i18next.t("loadError");
    select.innerHTML = "";
    select.appendChild(errorOption);
    select.disabled = true;
  }
};

const populateRegionSelect = async (galaxy, civilization) => {
  const select = document.getElementById("regionSelect");
  const regionInput = document.getElementById("regionInput");

  if (!galaxy || !civilization) {
    select.innerHTML = "";
    select.disabled = true;
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = !galaxy ? i18next.t("selectGalaxyFirst") : i18next.t("selectCivilizationFirst");
    select.appendChild(defaultOption);
    return;
  }

  const loadingOption = document.createElement("option");
  loadingOption.value = "";
  loadingOption.textContent = i18next.t("loadingRegions");
  loadingOption.disabled = true;
  select.innerHTML = "";
  select.appendChild(loadingOption);
  select.disabled = false;

  try {
    const cached = getCachedData(CIVILIZATIONS_CACHE_KEY);
    if (cached && cached.data[galaxy] && cached.data[galaxy].regions[civilization]) {
      const regionsForCiv = cached.data[galaxy].regions[civilization];
      select.innerHTML = "";
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = i18next.t("selectRegion");
      select.appendChild(defaultOption);

      regionsForCiv.forEach(region => {
        const option = document.createElement("option");
        option.value = region.coordinates || "";
        option.textContent = region.name;
        option.dataset.coordinates = region.coordinates || "";
        select.appendChild(option);
      });

      if (regionsForCiv.length === 0) {
        const noRegionsOption = document.createElement("option");
        noRegionsOption.value = "";
        noRegionsOption.textContent = i18next.t("noRegionsFound");
        noRegionsOption.disabled = true;
        select.appendChild(noRegionsOption);
      }
    }
    select.disabled = false;
    initializeChoices();
  } catch (error) {
    const errorOption = document.createElement("option");
    errorOption.value = "";
    errorOption.textContent = i18next.t("loadError");
    select.innerHTML = "";
    select.appendChild(errorOption);
    select.disabled = true;
  }
};

const onGalaxyChange = (select) => {
  const galaxy = select.value;
  populateCivilizationSelect(galaxy);
  document.getElementById("regionInput").value = "";
};

const onCivilizationChange = (select) => {
  const galaxy = document.getElementById("galaxySelect").value;
  const civilization = select.value;
  populateRegionSelect(galaxy, civilization);
  document.getElementById("regionInput").value = "";
};

const onRegionChange = (select) => {
  const coordinates = select.value;
  if (coordinates) {
    const glyphs = coords2Glyphs(coordinates);
    document.getElementById("regionInput").value = glyphs;
  } else {
    document.getElementById("regionInput").value = "";
  }
};

const initializeRegionSelection = async () => {
  await loadDefaultData();

  await populateGalaxySelect();

  fetchAllCivilizationsAndRegions()
    .then(() => console.log("Data updated in the background"))
    .catch(err => console.error("Error refreshing data:", err));
};

window.displayRandomGlyphs = displayRandomGlyphs;
window.copyToClipboard = copyToClipboard;
window.onGalaxyChange = onGalaxyChange;
window.onCivilizationChange = onCivilizationChange;
window.onRegionChange = onRegionChange;

const populateLanguageOptions = () => {
  const select = document.getElementById("lang");
  const languageNames = {
    en: "English",
    es: "Español",
    fr: "Français",
    de: "Deutsch",
    eu: "Euskara",
  };
  Object.keys(i18next.options.resources).forEach((lang) => {
    const option = document.createElement("option");
    option.value = lang;
    option.text = languageNames[lang];
    select.add(option);
  });
};

window.changeLanguage = () => {
  const lang = document.getElementById("lang").value;
  i18next.changeLanguage(lang);
  localStorage.setItem("i18nextLng", lang);
  $("body").localize();
};

i18next.init(
  {
    lng:
      localStorage.getItem("i18nextLng") ||
      navigator.language.split("-")[0] ||
      "en",
    resources: {
      en: {
        translation: {
          title: "NMS Glyph Generator",
          header: "NMS Glyph Generator",
          button: "Generate Glyphs",
          portalCode: "Portal Code:",
          copyButton: "Copy Code",
          copiedSuccess: "Code copied to clipboard!",
          copiedFail: "Error copying the code.",
          glyphinput: "Enter glyphs (12): Optional",
          fullportalcode: "You need to insert the full portal code!",
          selectGalaxy: "Select Galaxy",
          selectCivilization: "Select Civilization",
          selectRegion: "Select Region",
          loadingGalaxies: "Loading galaxies...",
          loadingCivilizations: "Loading civilizations...",
          loadingRegions: "Loading regions...",
          selectGalaxyFirst: "Select a galaxy first",
          selectCivilizationFirst: "Select a civilization first",
          noRegionsFound: "No regions found",
          loadError: "Error loading data",
          fetchError: "Error fetching data",
          regionSelection: "Region Selection",
          galaxy: "Galaxy",
          civilization: "Civilization",
          region: "Region",
          loadingData: "Loading data...",
          estimatedTime: "~{{minutes}}m {{seconds}}s remaining",
          estimatedTimeSeconds: "~{{seconds}}s remaining",
          complete: "Complete!",
          updatingFinish: "The regions update is complete.",
          updatingInfo: "The region update may take more than 5 minutes, please be patient."
        },
      },
      es: {
        translation: {
          title: "Generador de Glifos NMS",
          header: "Generador de Glifos NMS",
          button: "Generar Glifos",
          portalCode: "Código del Portal:",
          copyButton: "Copiar Código",
          copiedSuccess: "¡Código copiado al portapapeles!",
          copiedFail: "Error al copiar el código.",
          glyphinput: "Introduce glifos (12): Opcional",
          fullportalcode: "¡Es necesario insertar el código completo del portal!",
          selectGalaxy: "Seleccionar Galaxia",
          selectCivilization: "Seleccionar Civilización",
          selectRegion: "Seleccionar Región",
          loadingGalaxies: "Cargando galaxias...",
          loadingCivilizations: "Cargando civilizaciones...",
          loadingRegions: "Cargando regiones...",
          selectGalaxyFirst: "Selecciona una galaxia primero",
          selectCivilizationFirst: "Selecciona una civilización primero",
          noRegionsFound: "No se encontraron regiones",
          loadError: "Error cargando datos",
          fetchError: "Error obteniendo datos",
          regionSelection: "Selección de Región",
          galaxy: "Galaxia",
          civilization: "Civilización",
          region: "Región",
          loadingData: "Cargando datos...",
          estimatedTime: "~{{minutes}}m {{seconds}}s restantes",
          estimatedTimeSeconds: "~{{seconds}}s restantes",
          complete: "¡Completado!",
          updatingFinish: "Se ha terminado de actualizar las regiones.",
          updatingInfo: "La actualización de regiones puede tardar más de 5 minutos, sea paciente por favor."
        },
      },
      fr: {
        translation: {
          title: "Générateur de glyphes NMS",
          header: "Générateur de glyphes NMS",
          button: "Générer des glyphes",
          portalCode: "Code du portail:",
          copyButton: "Copier le code",
          copiedSuccess: "Code copié dans le presse-papiers!",
          copiedFail: "Erreur lors de la copie du code.",
          glyphinput: "Entrez les glyphes (12): Optionnel",
          fullportalcode: "Vous devez insérer le code complet du portail!",
          selectCivilization: "Sélectionner la Civilisation",
          selectRegion: "Sélectionner la Région",
          loadingCivilizations: "Chargement des civilisations...",
          loadingRegions: "Chargement des régions...",
          selectCivilizationFirst: "Sélectionnez d'abord une civilisation",
          noRegionsFound: "Aucune région trouvée",
          loadError: "Erreur de chargement des données",
          fetchError: "Erreur de récupération des données",
          regionSelection: "Sélection de Région",
          civilization: "Civilisation",
          region: "Région",
          loadingData: "Chargement des données...",
          estimatedTime: "~{{minutes}}m {{seconds}}s restantes",
          estimatedTimeSeconds: "~{{seconds}}s restantes",
          complete: "Terminé!",
          updatingFinish: "La mise à jour des régions est terminée.",
          updatingInfo: "La mise à jour de la région peut prendre plus de 5 minutes. Veuillez patienter."
        },
      },
      de: {
        translation: {
          title: "NMS Glyph Generator",
          header: "NMS Glyph Generator",
          button: "Glyphs generieren",
          portalCode: "Portal-Code:",
          copyButton: "Code kopieren",
          copiedSuccess: "Code in die Zwischenablage kopiert!",
          copiedFail: "Fehler beim Kopieren des Codes.",
          glyphinput: "Glyphs eingeben (12): Optional",
          fullportalcode: "Sie müssen den vollständigen Portalcode eingeben!",
          selectGalaxy: "Galaxie auswählen",
          selectCivilization: "Zivilisation auswählen",
          selectRegion: "Region auswählen",
          loadingGalaxies: "Lade Galaxien...",
          loadingCivilizations: "Lade Zivilisationen...",
          loadingRegions: "Lade Regionen...",
          selectGalaxyFirst: "Wählen Sie zuerst eine Galaxie",
          selectCivilizationFirst: "Wählen Sie zuerst eine Zivilisation",
          noRegionsFound: "Keine Regionen gefunden",
          loadError: "Fehler beim Laden der Daten",
          fetchError: "Fehler beim Abrufen der Daten",
          regionSelection: "Regionenauswahl",
          galaxy: "Galaxie",
          civilization: "Zivilisation",
          region: "Region",
          loadingData: "Daten werden geladen...",
          estimatedTime: "~{{minutes}}m {{seconds}}s verbleibend",
          estimatedTimeSeconds: "~{{seconds}}s verbleibend",
          complete: "Fertig!",
          updatingFinish: "Die Aktualisierung der Regionen ist abgeschlossen.",
          updatingInfo: "Die Aktualisierung der Region kann mehr als 5 Minuten dauern. Bitte haben Sie Geduld."
        },
      },
      eu: {
        translation: {
          title: "NMS Glifo Sortzailea",
          header: "NMS Glifo Sortzailea",
          button: "Sortu Glifoak",
          portalCode: "Atariaren Kodea:",
          copyButton: "Kopiatu Kodea",
          copiedSuccess: "Kodea ondo kopiatu da!",
          copiedFail: "Errorea kodea kopiatzerakoan.",
          glyphinput: "Sartu glifoak (12): Aukerakoa",
          fullportalcode: "Atariaren kode osoa sartu behar duzu!",
          selectGalaxy: "Hautatu Galaxia",
          selectCivilization: "Hautatu Zibilizazioa",
          selectRegion: "Hautatu Eskualdea",
          loadingGalaxies: "Galaxiak kargatzen...",
          loadingCivilizations: "Zibilizazioak kargatzen...",
          loadingRegions: "Eskualdeak kargatzen...",
          selectGalaxyFirst: "Hautatu galaxia bat lehenik",
          selectCivilizationFirst: "Hautatu zibilizazio bat lehenik",
          noRegionsFound: "Ez da eskualderik aurkitu",
          loadError: "Errorea datuak kargatzean",
          fetchError: "Errorea datuak eskuratzean",
          regionSelection: "Eskualde Hautaketa",
          galaxy: "Galaxia",
          civilization: "Zibilizazioa",
          region: "Eskualdea",
          loadingData: "Datuak kargatzen...",
          estimatedTime: "~{{minutes}}m {{seconds}}s geratzen",
          estimatedTimeSeconds: "~{{seconds}}s geratzen",
          complete: "Osatuta!",
          updatingFinish: "Eskualdeak gaurkotzen amaitu da.",
          updatingInfo: "Eskualdeak eguneratzeko 5 minutu baino gehiago behar dira, pazientzia izan mesedez."
        },
      },
    },
  },
  (err, t) => {
    jqueryI18next.init(i18next, $);
    $("body").localize();

    populateLanguageOptions();

    const lang =
      localStorage.getItem("i18nextLng") || i18next.language.split("-")[0];
    document.getElementById("lang").value = lang;

    initializeRegionSelection();
  }
);

document.addEventListener("DOMContentLoaded", () => {
  const generateButton = document.getElementById("generateButton");
  const copyButton = document.getElementById("copyButton");
  const glyphOutputContainer = document.getElementById("glyphOutputContainer");

  generateButton.disabled = false;
  copyButton.disabled = true;
  glyphOutputContainer.classList.remove("show");
});

function initializeChoices() {
  const galaxySelect = document.getElementById('galaxySelect');
  const civilizationSelect = document.getElementById('civilizationSelect');
  const regionSelect = document.getElementById('regionSelect');

  if (galaxySelect.choicesInstance) {
    galaxySelect.choicesInstance.destroy();
  }
  if (civilizationSelect.choicesInstance) {
    civilizationSelect.choicesInstance.destroy();
  }
  if (regionSelect.choicesInstance) {
    regionSelect.choicesInstance.destroy();
  }

  if (galaxySelect && !galaxySelect.disabled) {
    galaxySelect.choicesInstance = new Choices(galaxySelect, {
      searchEnabled: true,
      searchPlaceholderValue: 'Buscar galaxia...',
      itemSelectText: '',
      shouldSort: false,
    });
  }

  if (civilizationSelect && !civilizationSelect.disabled) {
    civilizationSelect.choicesInstance = new Choices(civilizationSelect, {
      searchEnabled: true,
      searchPlaceholderValue: 'Buscar civilización...',
      itemSelectText: '',
      shouldSort: false,
    });
  }

  if (regionSelect && !regionSelect.disabled) {
    regionSelect.choicesInstance = new Choices(regionSelect, {
      searchEnabled: true,
      searchPlaceholderValue: 'Buscar región...',
      itemSelectText: '',
      shouldSort: false,
    });
  }
}
