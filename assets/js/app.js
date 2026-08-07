(() => {
  const DATA = {
    aesr: 'data/reference/india_aesr_60_web.geojson',
    states: 'data/reference/india_states_web.geojson',
    pilots: 'data/pilot/aesr_shift_pilot_3.geojson',
    pilotSummary: 'data/pilot/pilot_summary.csv'
  };

  const PILOTS = {
    '2.1':  { id: 'P1', color: '#c47b2d', title: 'Hyper-arid reference system' },
    '10.3': { id: 'P2', color: '#277a62', title: 'Dry-subhumid reference system' },
    '16.3': { id: 'P3', color: '#416f9d', title: 'Perhumid reference system' }
  };

  const AER_COLORS = [
    '#5f8c73','#7ea589','#9aba9e','#b7ccb0','#d4dcc0',
    '#b99b66','#cdb17c','#ddc995','#eadcaf','#d4b2a5',
    '#bd8e82','#a56f6b','#8c646c','#77728a','#6b83a1',
    '#789ab1','#91b1bb','#93ad9e','#748f78','#536f61'
  ];

  const CLIMATE_COLORS = {
    'Hyper-arid': '#9f6034',
    'Arid': '#c07d3d',
    'Dry semi-arid': '#d89e54',
    'Moist semi-arid': '#dfc579',
    'Dry subhumid': '#b4c979',
    'Moist subhumid': '#78ad73',
    'Humid': '#4d9880',
    'Perhumid': '#3f7287',
    'Other / transition': '#b8c0ba'
  };

  const LGP_COLORS = {
    '<60 d': '#9c6035',
    '60–90 d': '#bc7a3d',
    '90–120 d': '#d39e58',
    '120–150 d': '#dfc279',
    '150–180 d': '#c3ce78',
    '180–210 d / transition': '#9fbe78',
    '210–240 d': '#76aa79',
    '240–270 d / transition': '#5a9180',
    '270–300+ d': '#497c88',
    '>300 d': '#3c6585',
    'Unclassified': '#b8c0ba'
  };

  const AWC_COLORS = {
    'Very Low': '#d7b38b',
    'Low': '#c99b70',
    'Low to Medium': '#d8c27e',
    'Medium': '#b9ca7b',
    'Medium to High': '#82ad77',
    'High': '#4f8d73',
    'Very High': '#3f6f70',
    'Other / not classified': '#b8c0ba'
  };

  const head = document.head;

  const addStylesheet = (href, id) => {
    if (id && document.getElementById(id)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    if (id) link.id = id;
    head.appendChild(link);
  };

  const loadScript = src => new Promise((resolve, reject) => {
    const existing = [...document.scripts].find(s => s.src === src);
    if (existing) {
      if (window.L && src.includes('leaflet')) return resolve();
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', reject, { once: true });
    document.body.appendChild(script);
  });

  addStylesheet('assets/css/dashboard-enhancements.css', 'dashboard-enhancements');
  addStylesheet('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'leaflet-css');

  const escapeHTML = value => String(value ?? '—')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const cleanText = value => String(value ?? '')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&amp;', '&')
    .trim();

  const getProp = (properties, ...names) => {
    if (!properties) return '';
    for (const name of names) {
      if (Object.prototype.hasOwnProperty.call(properties, name)) return properties[name];
      const key = Object.keys(properties).find(k => k.toLowerCase() === String(name).toLowerCase());
      if (key) return properties[key];
    }
    return '';
  };

  const signed = (value, digits = 1) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    if (n > 0) return `+${n.toFixed(digits)}`;
    return n.toFixed(digits).replace('-', '−');
  };

  const parseCSV = text => {
    const rows = [];
    let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i], next = text[i + 1];
      if (ch === '"' && quoted && next === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) { row.push(cell); cell = ''; }
      else if ((ch === '\n' || ch === '\r') && !quoted) {
        if (ch === '\r' && next === '\n') i += 1;
        row.push(cell);
        if (row.some(v => v !== '')) rows.push(row);
        row = []; cell = '';
      } else cell += ch;
    }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    if (rows.length < 2) return [];
    const headers = rows[0].map(v => v.trim());
    return rows.slice(1).map(values => Object.fromEntries(headers.map((h, i) => [h, (values[i] || '').trim()])));
  };

  const fetchJSON = async path => {
    const r = await fetch(path, { cache: 'no-store' });
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
    return r.json();
  };

  const fetchText = async path => {
    const r = await fetch(path, { cache: 'no-store' });
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
    return r.text();
  };

  const injectMapDashboard = () => {
    if (document.querySelector('#interactive-map')) return;
    const evidenceSection = document.querySelector('#preliminary-evidence');
    if (!evidenceSection) return;

    const section = document.createElement('section');
    section.className = 'section section-muted spatial-dashboard';
    section.id = 'interactive-map';
    section.innerHTML = `
      <div class="container map-container-wide">
        <div class="section-heading split-heading map-heading">
          <div>
            <p class="eyebrow">02 · Interactive analytical map</p>
            <h2>India AESR Explorer: reference environment, pilot evidence and spatial context</h2>
          </div>
          <span class="map-source-badge">Versioned local GeoJSON</span>
        </div>

        <p class="section-intro">Explore the cleaned AESR reference layer stored with this project. The map separates reference geography from preliminary evidence: all AESRs can be inspected by climate, LGP, AWC and soil, while only P1, P2 and P3 currently carry E2 pilot results. State/UT boundaries are contextual overlays and do not alter ecological identity.</p>

        <div class="map-kpis" aria-label="Spatial dashboard summary">
          <div class="map-kpi"><strong id="map-feature-count">…</strong><span>source polygon features</span></div>
          <div class="map-kpi"><strong id="map-identity-count">…</strong><span>unique AESR codes in current layer</span></div>
          <div class="map-kpi"><strong id="map-aer-count">…</strong><span>AER groups represented</span></div>
          <div class="map-kpi"><strong>3</strong><span>pilot AESRs with E2 evidence</span></div>
        </div>

        <div class="analysis-map-shell">
          <aside class="analysis-controls" aria-label="Map controls">
            <div class="control-block">
              <h3>Find an AESR</h3>
              <label class="sr-only" for="aesr-search">Search AESR code or subregion</label>
              <div class="map-search-row">
                <input id="aesr-search" list="aesr-search-list" type="search" placeholder="e.g. 10.3 or Vindhyan" autocomplete="off">
                <button id="aesr-search-button" type="button">Find</button>
              </div>
              <datalist id="aesr-search-list"></datalist>
            </div>

            <div class="control-block">
              <span class="map-tool-label">Thematic view</span>
              <div class="map-mode-list">
                <button class="map-mode active" id="map-reference" type="button" data-map-mode="reference">AER / AESR reference</button>
                <button class="map-mode" id="map-climate" type="button" data-map-mode="climate">Reference climate</button>
                <button class="map-mode" id="map-lgp" type="button" data-map-mode="lgp">Reference LGP</button>
                <button class="map-mode" id="map-awc" type="button" data-map-mode="awc">Available water capacity</button>
                <button class="map-mode" id="map-soil" type="button" data-map-mode="soil">Soil group</button>
                <button class="map-mode" id="map-pilots" type="button" data-map-mode="pilots">Pilot evidence</button>
              </div>
            </div>

            <div class="control-block">
              <span class="map-tool-label">Context overlays</span>
              <label class="map-check"><input id="toggle-states" type="checkbox" checked> State/UT boundaries</label>
              <label class="map-check"><input id="toggle-state-labels" type="checkbox" checked> State/UT labels</label>
              <label class="map-check"><input id="toggle-pilot-outlines" type="checkbox" checked> Pilot outlines</label>
            </div>

            <div class="control-block">
              <span class="map-tool-label">Go to pilot</span>
              <div class="pilot-jump-list">
                <button class="pilot-jump" type="button" data-pilot="P1" data-aesr="2.1"><b>P1</b><span>AESR 2.1 · Hyper-arid</span></button>
                <button class="pilot-jump" type="button" data-pilot="P2" data-aesr="10.3"><b>P2</b><span>AESR 10.3 · Dry subhumid</span></button>
                <button class="pilot-jump" type="button" data-pilot="P3" data-aesr="16.3"><b>P3</b><span>AESR 16.3 · Perhumid</span></button>
              </div>
              <button class="map-reset" type="button" id="map-reset">Reset to India</button>
            </div>

            <div class="map-status" id="map-status">Loading local AESR, state and pilot layers…</div>
          </aside>

          <div class="map-main analytical-map-main">
            <div id="aesr-map" role="region" aria-label="Interactive analytical map of India's Agro-Ecological Sub-Regions"></div>
            <div class="map-legend" id="map-legend" aria-live="polite"></div>
          </div>

          <aside class="analysis-panel" id="aesr-analysis-panel" aria-live="polite">
            <div class="analysis-empty">
              <span class="analysis-kicker">Selected AESR</span>
              <h3>Click a polygon to inspect it</h3>
              <p>The panel will show reference climate, LGP, soil, AWC and area. Pilot AESRs additionally display E2 rainfall-season evidence.</p>
            </div>
          </aside>
        </div>

        <div class="map-note-grid">
          <div class="map-note"><strong>Scientific separation</strong>Reference attributes are E0/E1 context. No national drift or risk score is displayed before daily climate and growing-period reconstruction is validated.</div>
          <div class="map-note"><strong>Reference-layer QA</strong>The current cleaned web layer contains source polygon parts and should be interpreted using AESR ecological identity, not feature count alone. The authoritative 60-identity reconciliation remains a formal project QA task.</div>
          <div class="map-note"><strong>Pilot evidence</strong>P1, P2 and P3 show E2 descriptive results only. The R10–R90 rainfall-active interval is not agronomic LGP and is not used here as proof of AESR drift.</div>
        </div>
      </div>`;

    evidenceSection.parentNode.insertBefore(section, evidenceSection);

    const replacements = new Map([
      ['#preliminary-evidence .eyebrow', '03 · Preliminary proof of concept'],
      ['#objectives .eyebrow', '04 · Research design'],
      ['#data .eyebrow', '05 · Data architecture'],
      ['#methods .eyebrow', '06 · Methods'],
      ['#evidence-framework .eyebrow', '07 · Evidence governance'],
      ['#outputs .eyebrow', '08 · Expected outputs'],
      ['#downloads .eyebrow', '09 · Resources']
    ]);
    replacements.forEach((text, selector) => {
      const node = document.querySelector(selector);
      if (node) node.textContent = text;
    });

    const siteNav = document.querySelector('#site-nav');
    if (siteNav && !siteNav.querySelector('a[href="#interactive-map"]')) {
      const link = document.createElement('a');
      link.href = '#interactive-map';
      link.textContent = 'Map';
      const evidenceLink = siteNav.querySelector('a[href="#preliminary-evidence"]');
      siteNav.insertBefore(link, evidenceLink || siteNav.firstChild);
    }
  };

  injectMapDashboard();

  const initNavigation = () => {
    const navToggle = document.querySelector('.nav-toggle');
    const siteNav = document.querySelector('#site-nav');
    const navLinks = [...document.querySelectorAll('.site-nav a')];
    if (navToggle && siteNav) {
      navToggle.addEventListener('click', () => {
        const open = siteNav.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', String(open));
      });
      navLinks.forEach(link => link.addEventListener('click', () => {
        siteNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }));
    }
    const navByHash = new Map(navLinks.map(link => [link.getAttribute('href'), link]));
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          navLinks.forEach(link => link.classList.remove('active'));
          const link = navByHash.get(`#${entry.target.id}`);
          if (link) link.classList.add('active');
        });
      }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
      document.querySelectorAll('main > section[id]').forEach(section => observer.observe(section));
    }
    const year = document.querySelector('#year');
    if (year) year.textContent = new Date().getFullYear();
  };

  const loadPilotTable = async () => {
    const body = document.querySelector('#pilot-table-body');
    if (!body) return;
    try {
      const records = parseCSV(await fetchText(DATA.pilotSummary));
      body.innerHTML = records.map(r => `
        <tr>
          <td><strong>${escapeHTML(r.PILOT_ID)}</strong></td>
          <td>${escapeHTML(r.AESR_CD)}</td>
          <td>${escapeHTML(r.CLIMATE)}</td>
          <td>${escapeHTML(r.LGP_REF)}</td>
          <td>${signed(r.MEDIAN_R10_CHANGE)} d</td>
          <td>${signed(r.MEDIAN_R90_CHANGE)} d</td>
          <td>${signed(r.MEDIAN_DURATION_CHANGE)} d</td>
          <td>${signed(r.MEDIAN_MAX_DRY_CHANGE)} d</td>
          <td>${signed(r.MEAN_ANNUAL_RAIN_CHANGE)} mm</td>
        </tr>`).join('');
    } catch (error) {
      body.innerHTML = '<tr><td colspan="9">Pilot table could not be loaded. Use the CSV download link.</td></tr>';
      console.warn(error);
    }
  };

  const climateClass = raw => {
    const x = cleanText(raw).toLowerCase();
    if (x.includes('hyper')) return 'Hyper-arid';
    if (x.includes('perhumid')) return 'Perhumid';
    if (x.includes('moist') && x.includes('subhumid')) return 'Moist subhumid';
    if ((x.includes('dry') && x.includes('subhumid')) || x.includes('subhumid (dry)')) return 'Dry subhumid';
    if (x.includes('humid')) return 'Humid';
    if (x.includes('moist') && x.includes('semi')) return 'Moist semi-arid';
    if ((x.includes('dry') && x.includes('semi')) || x.includes('semi-arid')) return 'Dry semi-arid';
    if (x === 'arid' || x.includes('arid (typic)')) return 'Arid';
    return 'Other / transition';
  };

  const lgpClass = raw => {
    const x = cleanText(raw).replaceAll(' ', '').replaceAll('–', '-').toLowerCase();
    if (x.includes('<60')) return '<60 d';
    if (x.includes('60-90')) return '60–90 d';
    if (x.includes('90-120')) return '90–120 d';
    if (x.includes('120-150')) return '120–150 d';
    if (x.includes('150-180')) return '150–180 d';
    if (x.includes('180-210') || x.includes('150-210')) return '180–210 d / transition';
    if (x.includes('210-240')) return '210–240 d';
    if (x.includes('240-270') || x.includes('210-270')) return '240–270 d / transition';
    if (x.includes('270-300')) return '270–300+ d';
    if (x.includes('>300')) return '>300 d';
    return 'Unclassified';
  };

  const awcClass = raw => {
    const x = cleanText(raw).toLowerCase();
    if (x.includes('very low')) return 'Very Low';
    if (x.includes('low') && x.includes('medium')) return 'Low to Medium';
    if (x.includes('medium') && x.includes('high')) return 'Medium to High';
    if (x.includes('very high')) return 'Very High';
    if (x === 'low') return 'Low';
    if (x === 'medium') return 'Medium';
    if (x === 'high') return 'High';
    return 'Other / not classified';
  };

  const stringColor = value => {
    const palette = ['#658a78','#7d9f8c','#9fb69a','#b9ae7e','#c19266','#ad796c','#8e7080','#6d7f9c','#698fa0','#7da89f','#9b9a6e','#8b6e58'];
    let hash = 0;
    for (const ch of cleanText(value)) hash = ((hash << 5) - hash) + ch.charCodeAt(0);
    return palette[Math.abs(hash) % palette.length];
  };

  const legendRows = rows => rows.map(([name, color]) => `<div class="legend-row"><span class="legend-swatch" style="background:${color}"></span><span>${escapeHTML(name)}</span></div>`).join('');

  const initMapDashboard = async () => {
    const mapNode = document.querySelector('#aesr-map');
    if (!mapNode) return;
    const statusNode = document.querySelector('#map-status');
    const legendNode = document.querySelector('#map-legend');
    const panelNode = document.querySelector('#aesr-analysis-panel');

    try {
      await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
      if (!window.L) throw new Error('Leaflet did not load');

      const [aesrData, statesData, pilotData, pilotCSV] = await Promise.all([
        fetchJSON(DATA.aesr),
        fetchJSON(DATA.states),
        fetchJSON(DATA.pilots),
        fetchText(DATA.pilotSummary)
      ]);
      const pilotRecords = parseCSV(pilotCSV);
      const pilotByCode = new Map(pilotRecords.map(r => [r.AESR_CD, r]));

      const featureCount = aesrData.features.length;
      const uniqueCodes = new Set(aesrData.features.map(f => cleanText(getProp(f.properties, 'aesr_code', 'AESR_CD'))).filter(Boolean));
      const uniqueAERs = new Set(aesrData.features.map(f => cleanText(getProp(f.properties, 'aer_code', 'AER_CD'))).filter(Boolean));
      document.querySelector('#map-feature-count').textContent = featureCount;
      document.querySelector('#map-identity-count').textContent = uniqueCodes.size;
      document.querySelector('#map-aer-count').textContent = uniqueAERs.size;

      const map = L.map('aesr-map', {
        center: [22.7, 79.2], zoom: 5, minZoom: 4, maxZoom: 11,
        zoomControl: true, preferCanvas: true
      });

      const lightBase = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Basemap © Esri', maxZoom: 16 }
      ).addTo(map);
      const osmBase = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 18
      });
      L.control.layers({ 'Light gray': lightBase, 'OpenStreetMap': osmBase }, null, { collapsed: true }).addTo(map);
      L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

      let currentMode = 'reference';
      let selectedLayer = null;
      let stateLayer = null;
      let stateLabelLayer = L.layerGroup().addTo(map);
      let pilotOutlineLayer = null;
      const featureLayers = [];

      const styleFor = feature => {
        const p = feature.properties || {};
        const code = cleanText(getProp(p, 'aesr_code', 'AESR_CD'));
        const aer = Number(getProp(p, 'aer_code', 'AER_CD'));
        const pilot = PILOTS[code];
        let fillColor = '#d7dfda', fillOpacity = 0.72;

        if (currentMode === 'reference') {
          const idx = Number.isFinite(aer) ? Math.max(0, Math.min(19, aer - 1)) : 0;
          fillColor = AER_COLORS[idx];
        } else if (currentMode === 'climate') {
          fillColor = CLIMATE_COLORS[climateClass(getProp(p, 'CLIM_STD', 'CLIMATE'))] || '#b8c0ba';
        } else if (currentMode === 'lgp') {
          fillColor = LGP_COLORS[lgpClass(getProp(p, 'lgp_ref', 'LGP_REF'))] || '#b8c0ba';
        } else if (currentMode === 'awc') {
          fillColor = AWC_COLORS[awcClass(getProp(p, 'AWC_REF'))] || '#b8c0ba';
        } else if (currentMode === 'soil') {
          fillColor = stringColor(getProp(p, 'SOIL_GRP'));
        } else if (currentMode === 'pilots') {
          fillColor = pilot ? pilot.color : '#e5e9e6';
          fillOpacity = pilot ? 0.88 : 0.25;
        }

        return {
          color: '#5f6d66', weight: 0.75, opacity: 0.85,
          fillColor, fillOpacity
        };
      };

      const stateStyle = { color: '#283b34', weight: 1.15, opacity: 0.82, fillOpacity: 0 };
      stateLayer = L.geoJSON(statesData, { style: stateStyle }).addTo(map);

      const makeStateLabels = () => {
        stateLabelLayer.clearLayers();
        L.geoJSON(statesData).eachLayer(layer => {
          const props = layer.feature?.properties || {};
          const name = cleanText(getProp(props, 'shapeName', 'NAME_1', 'ST_NM', 'state_name', 'NAME'));
          if (!name || !layer.getBounds) return;
          const center = layer.getBounds().getCenter();
          L.marker(center, {
            interactive: false,
            icon: L.divIcon({ className: 'state-label', html: `<span>${escapeHTML(name)}</span>`, iconSize: null })
          }).addTo(stateLabelLayer);
        });
      };
      makeStateLabels();

      const renderAnalysis = feature => {
        const p = feature.properties || {};
        const code = cleanText(getProp(p, 'aesr_code', 'AESR_CD'));
        const aer = cleanText(getProp(p, 'aer_code', 'AER_CD'));
        const subregion = cleanText(getProp(p, 'subregion', 'SUBREGION'));
        const climate = cleanText(getProp(p, 'CLIM_STD', 'CLIMATE'));
        const lgp = cleanText(getProp(p, 'lgp_ref', 'LGP_REF'));
        const soil = cleanText(getProp(p, 'SOIL_GRP'));
        const awc = cleanText(getProp(p, 'AWC_REF'));
        const area = Number(getProp(p, 'AREA_KM2'));
        const nParts = cleanText(getProp(p, 'NPARTS'));
        const pilot = PILOTS[code];
        const result = pilotByCode.get(code);

        const metric = (label, value, unit) => `<div class="analysis-metric"><strong>${escapeHTML(value)}${unit || ''}</strong><span>${escapeHTML(label)}</span></div>`;
        let evidenceHTML = `
          <div class="analysis-callout neutral">
            <b>Reference-only AESR</b>
            <p>No national drift, instability or crop-risk score has yet been assigned. This panel currently reports harmonized reference attributes only.</p>
          </div>`;

        if (pilot && result) {
          evidenceHTML = `
            <div class="analysis-evidence-head">
              <span class="evidence-badge e2">E2 · Preliminary derived evidence</span>
              <span>${escapeHTML(pilot.title)}</span>
            </div>
            <div class="analysis-metrics">
              ${metric('R10 change', signed(result.MEDIAN_R10_CHANGE), ' d')}
              ${metric('R90 change', signed(result.MEDIAN_R90_CHANGE), ' d')}
              ${metric('Duration change', signed(result.MEDIAN_DURATION_CHANGE), ' d')}
              ${metric('Max dry-spell change', signed(result.MEDIAN_MAX_DRY_CHANGE), ' d')}
              ${metric('Mean annual rainfall change', signed(result.MEAN_ANNUAL_RAIN_CHANGE), ' mm')}
            </div>
            <div class="analysis-callout pilot">
              <b>Interpretation boundary</b>
              <p>These are descriptive 1991–2000 versus 2015–2024 rainfall-season results. R10–R90 is a rainfall-active interval, not agronomic LGP; the pilot does not establish causal climate attribution or national transition.</p>
            </div>`;
        }

        panelNode.innerHTML = `
          <div class="analysis-panel-head" style="--selected:${pilot ? pilot.color : '#315f4b'}">
            <span class="analysis-kicker">${pilot ? `${pilot.id} · pilot AESR` : 'Reference AESR'}</span>
            <h3>AESR ${escapeHTML(code || '—')}</h3>
            <p>${escapeHTML(subregion || 'Subregion not available')}</p>
          </div>
          <dl class="analysis-attributes">
            <div><dt>AER</dt><dd>${escapeHTML(aer || '—')}</dd></div>
            <div><dt>Climate</dt><dd>${escapeHTML(climate || '—')}</dd></div>
            <div><dt>Reference LGP</dt><dd>${escapeHTML(lgp || '—')}</dd></div>
            <div><dt>Soil group</dt><dd>${escapeHTML(soil || '—')}</dd></div>
            <div><dt>AWC</dt><dd>${escapeHTML(awc || '—')}</dd></div>
            <div><dt>Area</dt><dd>${Number.isFinite(area) ? `${area.toLocaleString(undefined,{maximumFractionDigits:0})} km²` : '—'}</dd></div>
            ${nParts ? `<div><dt>Source parts</dt><dd>${escapeHTML(nParts)}</dd></div>` : ''}
          </dl>
          <div class="analysis-section-title">Analytical status</div>
          ${evidenceHTML}
          <a class="analysis-link" href="${pilot ? `#pilot-aesr-${code.replace('.', '-')}` : '#data-reference'}">Open related dashboard section →</a>`;
      };

      const onEachAESR = (feature, layer) => {
        featureLayers.push({ feature, layer });
        const p = feature.properties || {};
        const code = cleanText(getProp(p, 'aesr_code', 'AESR_CD'));
        const subregion = cleanText(getProp(p, 'subregion', 'SUBREGION'));
        layer.bindTooltip(`<b>AESR ${escapeHTML(code)}</b><br>${escapeHTML(subregion)}`, { sticky: true, direction: 'top', className: 'aesr-tooltip' });
        layer.on('mouseover', () => {
          if (layer !== selectedLayer) layer.setStyle({ weight: 2, color: '#213f34' });
        });
        layer.on('mouseout', () => {
          if (layer !== selectedLayer) layer.setStyle(styleFor(feature));
        });
        layer.on('click', () => {
          if (selectedLayer) selectedLayer.setStyle(styleFor(selectedLayer.feature));
          selectedLayer = layer;
          layer.setStyle({ color: '#132d24', weight: 3, fillOpacity: Math.min(0.92, styleFor(feature).fillOpacity + 0.08) });
          if (layer.bringToFront) layer.bringToFront();
          renderAnalysis(feature);
        });
      };

      const aesrLayer = L.geoJSON(aesrData, { style: styleFor, onEachFeature: onEachAESR }).addTo(map);

      const pilotStyle = feature => {
        const code = cleanText(getProp(feature.properties, 'aesr_code', 'AESR_CD'));
        const pilot = PILOTS[code] || { color: '#315f4b' };
        return { color: pilot.color, weight: 3.2, opacity: 1, fillOpacity: 0 };
      };
      pilotOutlineLayer = L.geoJSON(pilotData, {
        style: pilotStyle,
        onEachFeature: (feature, layer) => {
          const code = cleanText(getProp(feature.properties, 'aesr_code', 'AESR_CD'));
          const pilot = PILOTS[code];
          layer.bindTooltip(`${pilot?.id || 'Pilot'} · AESR ${escapeHTML(code)}`, { permanent: true, direction: 'center', className: `pilot-map-label ${pilot?.id?.toLowerCase() || ''}` });
          layer.on('click', () => {
            const match = featureLayers.find(x => cleanText(getProp(x.feature.properties, 'aesr_code', 'AESR_CD')) === code);
            if (match) {
              match.layer.fire('click');
              map.fitBounds(match.layer.getBounds().pad(0.25), { maxZoom: 7 });
            }
          });
        }
      }).addTo(map);

      const buildSearch = () => {
        const dataList = document.querySelector('#aesr-search-list');
        const seen = new Set();
        dataList.innerHTML = aesrData.features.map(f => {
          const p = f.properties || {};
          const code = cleanText(getProp(p, 'aesr_code', 'AESR_CD'));
          const name = cleanText(getProp(p, 'subregion', 'SUBREGION'));
          const key = `${code}|${name}`;
          if (!code || seen.has(key)) return '';
          seen.add(key);
          return `<option value="${escapeHTML(code)}">${escapeHTML(name)}</option>`;
        }).join('');
      };
      buildSearch();

      const findAESR = query => {
        const q = cleanText(query).toLowerCase();
        if (!q) return;
        const hit = featureLayers.find(({ feature }) => {
          const p = feature.properties || {};
          const code = cleanText(getProp(p, 'aesr_code', 'AESR_CD')).toLowerCase();
          const name = cleanText(getProp(p, 'subregion', 'SUBREGION')).toLowerCase();
          return code === q || name.includes(q);
        });
        if (!hit) {
          statusNode.textContent = `No AESR matched “${query}”. Try an AESR code such as 10.3 or part of a subregion name.`;
          return;
        }
        map.fitBounds(hit.layer.getBounds().pad(0.18), { maxZoom: 7 });
        hit.layer.fire('click');
        statusNode.textContent = `Selected AESR ${cleanText(getProp(hit.feature.properties, 'aesr_code', 'AESR_CD'))}.`;
      };

      document.querySelector('#aesr-search-button')?.addEventListener('click', () => findAESR(document.querySelector('#aesr-search').value));
      document.querySelector('#aesr-search')?.addEventListener('keydown', e => { if (e.key === 'Enter') findAESR(e.target.value); });

      const legendFor = mode => {
        if (mode === 'climate') return `<strong>Reference climate</strong>${legendRows(Object.entries(CLIMATE_COLORS))}`;
        if (mode === 'lgp') return `<strong>Reference LGP</strong>${legendRows(Object.entries(LGP_COLORS))}`;
        if (mode === 'awc') return `<strong>Available water capacity</strong>${legendRows(Object.entries(AWC_COLORS))}`;
        if (mode === 'soil') {
          const soils = [...new Set(aesrData.features.map(f => cleanText(getProp(f.properties, 'SOIL_GRP'))).filter(Boolean))].sort();
          return `<strong>Soil group</strong><div class="legend-scroll">${legendRows(soils.map(s => [s, stringColor(s)]))}</div>`;
        }
        if (mode === 'pilots') return `<strong>Pilot evidence</strong>${legendRows([
          ['P1 · AESR 2.1', PILOTS['2.1'].color], ['P2 · AESR 10.3', PILOTS['10.3'].color], ['P3 · AESR 16.3', PILOTS['16.3'].color], ['Other AESRs', '#e5e9e6']
        ])}<p class="legend-note">Pilot colour indicates selection for proof of concept, not risk level.</p>`;
        return `<strong>AER / AESR reference</strong><p class="legend-note">Fill colour separates AER groups. Thin internal lines preserve source AESR polygons; click any polygon for reference attributes.</p>`;
      };

      const setMode = mode => {
        currentMode = mode;
        document.querySelectorAll('.map-mode').forEach(btn => btn.classList.toggle('active', btn.dataset.mapMode === mode));
        aesrLayer.eachLayer(layer => layer.setStyle(styleFor(layer.feature)));
        if (selectedLayer) selectedLayer.setStyle({ ...styleFor(selectedLayer.feature), color: '#132d24', weight: 3 });
        legendNode.innerHTML = legendFor(mode);
        const labels = {
          reference: 'AER/AESR reference view using the cleaned project GeoJSON.',
          climate: 'Reference climate classes from the harmonized AESR attributes.',
          lgp: 'Reference LGP classes. Open-ended classes remain open-ended.',
          awc: 'Reference available-water-capacity classes from the harmonized AESR attributes.',
          soil: 'Categorical soil groups; colours are for visual separation only.',
          pilots: 'P1-P3 highlighted as proof-of-concept sites. Colours do not represent severity or risk.'
        };
        statusNode.textContent = labels[mode];
      };

      document.querySelectorAll('.map-mode').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mapMode)));
      document.querySelectorAll('.pilot-jump').forEach(button => button.addEventListener('click', () => {
        setMode('pilots');
        const code = button.dataset.aesr;
        const hit = featureLayers.find(x => cleanText(getProp(x.feature.properties, 'aesr_code', 'AESR_CD')) === code);
        if (hit) {
          map.fitBounds(hit.layer.getBounds().pad(0.25), { maxZoom: 7 });
          hit.layer.fire('click');
        }
      }));

      document.querySelector('#toggle-states')?.addEventListener('change', e => {
        if (e.target.checked) stateLayer.addTo(map); else map.removeLayer(stateLayer);
      });
      document.querySelector('#toggle-state-labels')?.addEventListener('change', e => {
        if (e.target.checked) stateLabelLayer.addTo(map); else map.removeLayer(stateLabelLayer);
      });
      document.querySelector('#toggle-pilot-outlines')?.addEventListener('change', e => {
        if (e.target.checked) pilotOutlineLayer.addTo(map); else map.removeLayer(pilotOutlineLayer);
      });
      document.querySelector('#map-reset')?.addEventListener('click', () => {
        map.fitBounds(aesrLayer.getBounds().pad(0.02));
        if (selectedLayer) { selectedLayer.setStyle(styleFor(selectedLayer.feature)); selectedLayer = null; }
        panelNode.innerHTML = `<div class="analysis-empty"><span class="analysis-kicker">Selected AESR</span><h3>Click a polygon to inspect it</h3><p>The panel will show reference climate, LGP, soil, AWC and area. Pilot AESRs additionally display E2 rainfall-season evidence.</p></div>`;
        document.querySelector('#aesr-search').value = '';
        statusNode.textContent = 'Reset to the national AESR extent.';
      });

      legendNode.innerHTML = legendFor('reference');
      map.fitBounds(aesrLayer.getBounds().pad(0.02));
      statusNode.textContent = `Loaded ${featureCount} source polygon features, ${uniqueCodes.size} unique AESR codes, ${uniqueAERs.size} AER groups and 3 pilot polygons from project files.`;
      setTimeout(() => map.invalidateSize(), 250);
    } catch (error) {
      console.error('Interactive analytical map:', error);
      statusNode.textContent = 'The analytical map could not load one or more project files. Check the GeoJSON paths and reload.';
      mapNode.innerHTML = '<div class="map-error"><strong>Map unavailable</strong><p>The rest of the research dashboard remains available.</p></div>';
    }
  };

  initNavigation();
  loadPilotTable();
  initMapDashboard();
})();