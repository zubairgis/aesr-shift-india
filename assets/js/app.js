(() => {
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
      if (existing.dataset.loaded === 'true') return resolve();
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', reject, { once: true });
    document.body.appendChild(script);
  });

  /* Typography and map styles are deliberately separate from the base stylesheet. */
  addStylesheet('assets/css/dashboard-enhancements.css', 'dashboard-enhancements');
  addStylesheet('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'leaflet-css');

  const escapeHTML = value => String(value ?? '—')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const injectMapDashboard = () => {
    if (document.querySelector('#interactive-map')) return;

    const evidenceSection = document.querySelector('#preliminary-evidence');
    if (!evidenceSection) return;

    const mapSection = document.createElement('section');
    mapSection.className = 'section section-muted spatial-dashboard';
    mapSection.id = 'interactive-map';
    mapSection.innerHTML = `
      <div class="container">
        <div class="section-heading split-heading">
          <div>
            <p class="eyebrow">02 · Interactive spatial dashboard</p>
            <h2>Explore India’s agro-ecological framework and the three pilot AESRs</h2>
          </div>
          <span class="map-source-badge">Live AESR reference service</span>
        </div>

        <p class="section-intro">The map displays the current Agro-Ecological Sub-Regions service as an interactive reference layer. Switch between AESR/AER context, climate regime, reference Length of Growing Period (LGP), and the three proposal pilot zones. Click any polygon for its reference attributes.</p>

        <div class="map-kpis" aria-label="Spatial dashboard summary">
          <div class="map-kpi"><strong id="map-feature-count">…</strong><span>source polygon features</span></div>
          <div class="map-kpi"><strong>20</strong><span>Agro-Ecological Regions</span></div>
          <div class="map-kpi"><strong>3</strong><span>proposal pilot AESRs</span></div>
          <div class="map-kpi"><strong>E0–E2</strong><span>reference to pilot evidence</span></div>
        </div>

        <div class="map-shell">
          <aside class="map-tools" aria-label="Map controls">
            <h3>Map view</h3>
            <p>Change the thematic interpretation without changing the underlying AESR geometry.</p>

            <span class="map-tool-label">Thematic layer</span>
            <div class="map-mode-list">
              <button class="map-mode active" id="map-reference" type="button" data-map-mode="reference">AESR / AER reference</button>
              <button class="map-mode" id="map-climate" type="button" data-map-mode="climate">Climate regime</button>
              <button class="map-mode" id="map-lgp" type="button" data-map-mode="lgp">Reference LGP</button>
              <button class="map-mode" id="map-pilots" type="button" data-map-mode="pilots">Pilot zones</button>
            </div>

            <span class="map-tool-label">Go to pilot</span>
            <div class="pilot-jump-list">
              <button class="pilot-jump" type="button" data-pilot="P1" data-aesr="2.1">P1 · AESR 2.1</button>
              <button class="pilot-jump" type="button" data-pilot="P2" data-aesr="10.3">P2 · AESR 10.3</button>
              <button class="pilot-jump" type="button" data-pilot="P3" data-aesr="16.3">P3 · AESR 16.3</button>
            </div>
            <button class="map-reset" type="button" id="map-reset">Reset to India</button>

            <div class="map-status" id="map-status">Loading interactive AESR layer…</div>
          </aside>

          <div class="map-main">
            <div id="aesr-map" role="region" aria-label="Interactive map of India Agro-Ecological Sub-Regions"></div>
            <div class="map-legend" id="map-legend" aria-live="polite"></div>
          </div>
        </div>

        <div class="map-note-grid">
          <div class="map-note"><strong>Reference layer</strong>The live service is used for spatial exploration. Final analytical work will retain source provenance and complete the official 60-AESR quality check before national inference.</div>
          <div class="map-note"><strong>Pilot overlay</strong>P1 = AESR 2.1 hyper-arid; P2 = AESR 10.3 dry subhumid; P3 = AESR 16.3 perhumid. Pilot evidence is E2 and remains preliminary.</div>
          <div class="map-note"><strong>Proposal use</strong>This section has stable anchors for the spatial framework and each thematic map view, allowing direct proposal cross-reference.</div>
        </div>
      </div>`;

    evidenceSection.parentNode.insertBefore(mapSection, evidenceSection);

    /* Renumber the following top-level dashboard section captions after adding the spatial dashboard. */
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

  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('#site-nav');
  const navLinks = [...document.querySelectorAll('.site-nav a')];

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const open = siteNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        siteNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const topLevelSections = [...document.querySelectorAll('main > section[id]')];
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

    topLevelSections.forEach(section => observer.observe(section));
  }

  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();

  const signed = value => {
    const number = Number(value);
    if (Number.isNaN(number)) return value || '—';
    if (number > 0) return `+${number.toFixed(1)}`;
    return number.toFixed(1).replace('-', '−');
  };

  const parseCSV = text => {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      const next = text[i + 1];

      if (ch === '"' && quoted && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = !quoted;
      } else if (ch === ',' && !quoted) {
        row.push(cell);
        cell = '';
      } else if ((ch === '\n' || ch === '\r') && !quoted) {
        if (ch === '\r' && next === '\n') i += 1;
        row.push(cell);
        if (row.some(v => v !== '')) rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += ch;
      }
    }

    if (cell.length || row.length) {
      row.push(cell);
      rows.push(row);
    }

    if (rows.length < 2) return [];
    const headers = rows[0].map(v => v.trim());
    return rows.slice(1).map(values => Object.fromEntries(headers.map((h, i) => [h, (values[i] || '').trim()])));
  };

  const loadPilotTable = async () => {
    const body = document.querySelector('#pilot-table-body');
    if (!body) return;

    try {
      const response = await fetch('data/pilot/pilot_summary.csv', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const records = parseCSV(await response.text());
      if (!records.length) throw new Error('No records');

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
        </tr>
      `).join('');
    } catch (error) {
      body.innerHTML = '<tr><td colspan="9">Pilot table could not be loaded. Use the CSV download link above.</td></tr>';
      console.warn('Pilot evidence table:', error);
    }
  };

  loadPilotTable();

  /* ---------------------- Interactive AESR map ---------------------- */
  const MAP_SERVICE = 'https://livingatlas.esri.in/server1/rest/services/India/Agro_Ecological_Sub_Regions/MapServer/0';
  const pilotCodes = new Map([
    ['2.1', { id: 'P1', color: '#b8752a', signal: 'Later R10 (+13.0 d); E2 preliminary evidence' }],
    ['10.3', { id: 'P2', color: '#28745a', signal: 'Greater interannual onset and dry-spell variability; E2 preliminary evidence' }],
    ['16.3', { id: 'P3', color: '#416f9d', signal: 'Lower mean annual rainfall (−278.1 mm) with small duration change; E2 preliminary evidence' }]
  ]);

  const getProp = (properties, ...names) => {
    if (!properties) return '';
    for (const name of names) {
      if (Object.prototype.hasOwnProperty.call(properties, name)) return properties[name];
      const key = Object.keys(properties).find(k => k.toLowerCase() === String(name).toLowerCase());
      if (key) return properties[key];
    }
    return '';
  };

  const cleanText = value => String(value ?? '')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&amp;', '&')
    .trim();

  const aerPalette = [
    '#cfe4d8','#a9d1bd','#82bca0','#5fa886','#3f916e',
    '#d8dfb8','#c3cf91','#adb96d','#929e55','#7e8846',
    '#ead9ae','#ddc486','#cda968','#b98e50','#a67543',
    '#d9c7df','#c0a8ce','#a78cbb','#8e72a7','#755b92'
  ];

  const climateInfo = value => {
    const text = cleanText(value).toLowerCase();
    if (text.includes('hyper')) return ['Hyper-arid', '#9b6634'];
    if (text.includes('arid (typic)') || text === 'arid') return ['Arid', '#c18542'];
    if (text.includes('semi-arid (dry)')) return ['Dry semi-arid', '#d9a35d'];
    if (text.includes('semi-arid (moist)')) return ['Moist semi-arid', '#dec982'];
    if (text.includes('subhumid (dry)') || text.includes('dry subhumid')) return ['Dry subhumid', '#a4c27f'];
    if (text.includes('subhumid (moist)') || text.includes('moist subhumid')) return ['Moist subhumid', '#6ca779'];
    if (text.includes('perhumid')) return ['Perhumid', '#356f83'];
    if (text.includes('humid')) return ['Humid', '#428c78'];
    return ['Other / transition', '#b8c0ba'];
  };

  const lgpInfo = value => {
    const text = cleanText(value).replaceAll(' ', '').toLowerCase();
    if (text.includes('<60')) return ['<60 d', '#a56a36'];
    if (text.includes('60-90')) return ['60–90 d', '#c48748'];
    if (text.includes('90-120')) return ['90–120 d', '#d5a964'];
    if (text.includes('120-150')) return ['120–150 d', '#dfc983'];
    if (text.includes('150-180')) return ['150–180 d', '#b8cb79'];
    if (text.includes('150-210') || text.includes('180-210')) return ['180–210 d / transition', '#8fb975'];
    if (text.includes('210-240')) return ['210–240 d', '#6da67c'];
    if (text.includes('210-270') || text.includes('240-270')) return ['240–270 d / transition', '#538e80'];
    if (text.includes('270-300')) return ['270–300+ d', '#437b87'];
    if (text.includes('>300')) return ['>300 d', '#355f84'];
    return ['Unclassified', '#b8c0ba'];
  };

  const legendHTML = mode => {
    if (mode === 'climate') {
      const rows = [
        ['Hyper-arid','#9b6634'],['Arid','#c18542'],['Dry semi-arid','#d9a35d'],
        ['Moist semi-arid','#dec982'],['Dry subhumid','#a4c27f'],['Moist subhumid','#6ca779'],
        ['Humid','#428c78'],['Perhumid','#356f83'],['Transition / other','#b8c0ba']
      ];
      return `<strong>Reference climate regime</strong>${rows.map(([n,c]) => `<div class="legend-row"><span class="legend-swatch" style="background:${c}"></span><span>${n}</span></div>`).join('')}`;
    }
    if (mode === 'lgp') {
      const rows = [
        ['<60 d','#a56a36'],['60–90 d','#c48748'],['90–120 d','#d5a964'],['120–150 d','#dfc983'],
        ['150–180 d','#b8cb79'],['180–210 d / transition','#8fb975'],['210–240 d','#6da67c'],
        ['240–270 d / transition','#538e80'],['270–300+ d','#437b87'],['>300 d','#355f84']
      ];
      return `<strong>Reference LGP class</strong>${rows.map(([n,c]) => `<div class="legend-row"><span class="legend-swatch" style="background:${c}"></span><span>${n}</span></div>`).join('')}`;
    }
    if (mode === 'pilots') {
      return `<strong>Proposal pilot AESRs</strong>
        <div class="legend-row"><span class="legend-swatch" style="background:#b8752a"></span><span>P1 · AESR 2.1 · Hyper-arid</span></div>
        <div class="legend-row"><span class="legend-swatch" style="background:#28745a"></span><span>P2 · AESR 10.3 · Dry subhumid</span></div>
        <div class="legend-row"><span class="legend-swatch" style="background:#416f9d"></span><span>P3 · AESR 16.3 · Perhumid</span></div>
        <div class="legend-row"><span class="legend-swatch" style="background:#e6ebe7"></span><span>Other AESR source polygons</span></div>`;
    }
    return `<strong>AESR / AER reference</strong><p style="margin:0;color:#64756c">Colour separates the 20 AER groups. Pilot AESRs retain a stronger outline. Click any polygon for reference attributes.</p>`;
  };

  const initMapDashboard = async () => {
    const mapNode = document.querySelector('#aesr-map');
    if (!mapNode) return;

    const statusNode = document.querySelector('#map-status');
    const legendNode = document.querySelector('#map-legend');
    const countNode = document.querySelector('#map-feature-count');

    try {
      await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
      await loadScript('https://unpkg.com/esri-leaflet@3.0.15/dist/esri-leaflet.js');

      if (!window.L || !window.L.esri) throw new Error('Leaflet libraries did not load');

      const map = L.map('aesr-map', {
        center: [22.7, 79.2],
        zoom: 5,
        minZoom: 4,
        maxZoom: 11,
        zoomControl: true,
        preferCanvas: true
      });

      const lightBase = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles © Esri', maxZoom: 16 }
      ).addTo(map);

      const osmBase = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '© OpenStreetMap contributors', maxZoom: 18 }
      );

      L.control.layers({ 'Light gray': lightBase, 'OpenStreetMap': osmBase }, null, { collapsed: true }).addTo(map);

      let currentMode = 'reference';

      const featureStyle = feature => {
        const p = feature?.properties || {};
        const aesr = cleanText(getProp(p, 'aesr_cd', 'AESR_CD'));
        const aerRaw = Number(getProp(p, 'ae_rgcd', 'AER_CD', 'aer_code'));
        const pilot = pilotCodes.get(aesr);
        let fillColor = '#cbd8d0';
        let fillOpacity = 0.62;

        if (currentMode === 'reference') {
          const idx = Number.isFinite(aerRaw) ? Math.max(0, Math.min(19, aerRaw - 1)) : 0;
          fillColor = aerPalette[idx];
          fillOpacity = 0.72;
        } else if (currentMode === 'climate') {
          fillColor = climateInfo(getProp(p, 'climat_', 'CLIMATE', 'climate_ref'))[1];
          fillOpacity = 0.76;
        } else if (currentMode === 'lgp') {
          fillColor = lgpInfo(getProp(p, 'lgp', 'LGP_REF', 'lgp_ref'))[1];
          fillOpacity = 0.78;
        } else if (currentMode === 'pilots') {
          fillColor = pilot ? pilot.color : '#e6ebe7';
          fillOpacity = pilot ? 0.92 : 0.38;
        }

        return {
          color: pilot ? '#472f21' : '#66766d',
          weight: pilot ? 2.4 : 0.7,
          opacity: pilot ? 1 : 0.8,
          fillColor,
          fillOpacity
        };
      };

      const popupHTML = feature => {
        const p = feature?.properties || {};
        const aesr = cleanText(getProp(p, 'aesr_cd', 'AESR_CD'));
        const pilot = pilotCodes.get(aesr);
        const aer = cleanText(getProp(p, 'ae_rgcd', 'AER_CD', 'aer_code'));
        const aerName = cleanText(getProp(p, 'phys_rg', 'AER_NAME', 'aer_name'));
        const subregion = cleanText(getProp(p, 'sb_phy_', 'SUBREGION', 'subregion'));
        const climate = cleanText(getProp(p, 'climat_', 'CLIMATE', 'climate_ref'));
        const lgp = cleanText(getProp(p, 'lgp', 'LGP_REF', 'lgp_ref'));
        const soil = cleanText(getProp(p, 'sol_typ', 'SOIL_GRP', 'soil_type'));
        const area = cleanText(getProp(p, 'ar_sqkm', 'AREA_KM2', 'source_area_km2'));
        const areaText = area && !Number.isNaN(Number(area)) ? `${Number(area).toLocaleString(undefined, { maximumFractionDigits: 0 })} km²` : (area || '—');

        return `<div class="aesr-popup">
          <h4>${pilot ? `${pilot.id} · ` : ''}AESR ${escapeHTML(aesr || '—')}</h4>
          <dl>
            <dt>AER</dt><dd>${escapeHTML(aer)}${aerName ? ` · ${escapeHTML(aerName)}` : ''}</dd>
            <dt>Subregion</dt><dd>${escapeHTML(subregion || '—')}</dd>
            <dt>Climate</dt><dd>${escapeHTML(climate || '—')}</dd>
            <dt>Ref. LGP</dt><dd>${escapeHTML(lgp || '—')}</dd>
            <dt>Soil</dt><dd>${escapeHTML(soil || '—')}</dd>
            <dt>Area</dt><dd>${escapeHTML(areaText)}</dd>
          </dl>
          ${pilot ? `<div class="pilot-popup">${escapeHTML(pilot.signal)}</div>` : ''}
        </div>`;
      };

      const aesrLayer = L.esri.featureLayer({
        url: MAP_SERVICE,
        simplifyFactor: 0.4,
        precision: 5,
        style: featureStyle,
        onEachFeature: (feature, layer) => {
          const p = feature.properties || {};
          const aesr = cleanText(getProp(p, 'aesr_cd', 'AESR_CD'));
          const subregion = cleanText(getProp(p, 'sb_phy_', 'SUBREGION', 'subregion'));
          layer.bindTooltip(`AESR ${escapeHTML(aesr)}${subregion ? ` · ${escapeHTML(subregion)}` : ''}`, { sticky: true, direction: 'top' });
          layer.bindPopup(popupHTML(feature), { maxWidth: 330 });
          layer.on('mouseover', () => layer.setStyle({ weight: Math.max(featureStyle(feature).weight, 2), color: '#1f4f3b' }));
          layer.on('mouseout', () => layer.setStyle(featureStyle(feature)));
        }
      }).addTo(map);

      aesrLayer.on('load', () => {
        if (statusNode) statusNode.textContent = 'AESR reference layer loaded. Click a polygon to inspect reference attributes.';
      });

      aesrLayer.on('requesterror', event => {
        console.warn('AESR service request:', event);
        if (statusNode) statusNode.textContent = 'The AESR service could not be reached. Reload the page or check the source service.';
      });

      aesrLayer.query().where('1=1').count((error, count) => {
        if (!error && countNode) countNode.textContent = String(count);
      });

      const setMode = mode => {
        currentMode = mode;
        document.querySelectorAll('.map-mode').forEach(btn => btn.classList.toggle('active', btn.dataset.mapMode === mode));
        aesrLayer.setStyle(featureStyle);
        if (legendNode) legendNode.innerHTML = legendHTML(mode);
        if (statusNode) {
          const labels = {
            reference: 'AESR/AER reference view: colour separates AER groups; pilots have a stronger outline.',
            climate: 'Climate view: polygons are coloured by the source reference climate description.',
            lgp: 'LGP view: polygons are coloured by the source reference Length of Growing Period class.',
            pilots: 'Pilot view: P1, P2 and P3 are emphasized against the national AESR framework.'
          };
          statusNode.textContent = labels[mode];
        }
      };

      document.querySelectorAll('.map-mode').forEach(button => {
        button.addEventListener('click', () => setMode(button.dataset.mapMode));
      });

      document.querySelectorAll('.pilot-jump').forEach(button => {
        button.addEventListener('click', () => {
          const code = button.dataset.aesr;
          setMode('pilots');
          aesrLayer.query().where(`aesr_cd='${code}'`).bounds((error, bounds) => {
            if (!error && bounds && bounds.isValid()) map.fitBounds(bounds.pad(0.35), { maxZoom: 7 });
          });
        });
      });

      document.querySelector('#map-reset')?.addEventListener('click', () => {
        map.setView([22.7, 79.2], 5);
      });

      if (legendNode) legendNode.innerHTML = legendHTML('reference');

      setTimeout(() => map.invalidateSize(), 350);
    } catch (error) {
      console.warn('Interactive AESR map:', error);
      if (statusNode) statusNode.textContent = 'Interactive map could not be initialized. The rest of the dashboard remains available.';
      mapNode.innerHTML = '<div style="padding:2rem;color:#5b6b63">Interactive map unavailable. Please reload the dashboard.</div>';
    }
  };

  initMapDashboard();
})();
