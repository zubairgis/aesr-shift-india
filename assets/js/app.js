(() => {
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

  const format = value => {
    if (value === null || value === undefined || value === '') return '—';
    const number = Number(value);
    if (Number.isNaN(number)) return value;
    return number.toFixed(1);
  };

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
          <td><strong>${r.PILOT_ID}</strong></td>
          <td>${r.AESR_CD}</td>
          <td>${r.CLIMATE}</td>
          <td>${r.LGP_REF}</td>
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
})();
