const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html', 'utf8');
const code = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)[1];

function harness(respond) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {id, hidden: false, disabled: false, textContent: '', style: {}, addEventListener() {}});
    return elements.get(id);
  };
  const requests = [];
  const charts = new Map();
  const context = vm.createContext({
    console,
    document: {addEventListener() {}, getElementById: element},
    window: {addEventListener() {}, setInterval() {}},
    Chart: function(canvas, config) {
      this.config = config;
      this.destroy = () => {};
      charts.set(canvas.id, config);
    },
    mockFetch: async (path, params) => {
      requests.push({path, ...params});
      return respond(path, params);
    }
  });
  vm.runInContext(code, context);
  vm.runInContext('pollenSenseFetch = mockFetch;', context);
  return {elements, element, charts, requests, context, load: () => vm.runInContext('loadPollenSenseLive()', context)};
}

const sites = [{SiteId: 'active', Name: 'Estación activa'}];
function metrics({moments = ['2020-05-01T00:00:00Z'], volumes = [10], counts = {}} = {}) {
  return {Moments: moments, CubicMeters: volumes, Counts: counts};
}
function daySpan(request) {
  return Math.round((Date.parse(request.ending) - Date.parse(request.starting)) / 86400000);
}

(async () => {
  // A delayed daily aggregate remains visible and must not gate the independent hourly query.
  {
    const h = harness(path => path === '/sites' ? sites : metrics());
    await h.load();
    assert.equal(h.element('pollenSenseLiveCard').hidden, false);
    assert.equal(h.element('psDailyPanel').hidden, false);
    assert.equal(h.element('psHourlyPanel').hidden, false);
    assert.equal(h.charts.get('pollenSenseChart').data.datasets[0].data[0], 0);
    assert.equal(h.charts.get('pollenSenseHourlyChart').data.datasets[0].data[0], 0);
    assert.equal(h.element('psSiteLabel').textContent, '1 estación/es');
  }
  // Even both daily attempts failing must not prevent hourly data or its chart.
  {
    const h = harness((path, params) => {
      if (path === '/sites') return sites;
      if (params.interval === 'day') throw new Error('daily query unavailable');
      return metrics({counts: {Olea: [20]}});
    });
    await h.load();
    assert.equal(h.element('psDailyPanel').hidden, true);
    assert.equal(h.element('psHourlyPanel').hidden, false);
    assert.equal(h.charts.get('pollenSenseHourlyChart').data.datasets[0].data[0], 2);
    assert.deepEqual(h.requests.filter(r => r.interval === 'day').map(daySpan), [180, 30]);
    assert.equal(h.element('pollenSenseLiveCard').hidden, false);
    assert.equal(h.element('psRefresh').disabled, false);
  }
  // Explicitly inactive stations are omitted from every metric request and dataset.
  {
    const h = harness(path => path === '/sites'
      ? [...sites, {SiteId: 'inactive', Name: 'Inactiva', IsActive: false}, {SiteId: 'inactive-string', Active: 'false'}]
      : metrics());
    await h.load();
    assert.ok(h.requests.filter(r => r.path !== '/sites').every(r => r.path.includes('/active/')));
    assert.equal(h.element('psSiteLabel').textContent, '1 estación/es');
  }
  // Positive sampled volume with absent pollen categories produces zero; no sampling is excluded.
  {
    const h = harness(path => {
      if (path === '/sites') return [...sites, {SiteId: 'no-volume', Name: 'Sin muestreo'}];
      return metrics({volumes: path.includes('/no-volume/') ? [0] : [10]});
    });
    await h.load();
    for (const id of ['pollenSenseChart', 'pollenSenseHourlyChart']) {
      const data = h.charts.get(id).data;
      assert.equal(data.datasets.length, 1);
      assert.equal(data.datasets[0].label, 'Estación activa');
      assert.equal(data.datasets[0].data[0], 0);
    }
  }
  // Empty periods hide only the empty panels. A later refresh repopulates them and retains controls.
  {
    let available = false;
    const h = harness(path => path === '/sites' ? sites : metrics({volumes: [available ? 10 : 0]}));
    await h.load();
    assert.equal(h.element('pollenSenseLiveCard').hidden, false);
    assert.equal(h.element('psDailyPanel').hidden, true);
    assert.equal(h.element('psHourlyPanel').hidden, true);
    assert.equal(h.element('psRefresh').disabled, false);
    available = true;
    await h.load();
    assert.equal(h.element('psDailyPanel').hidden, false);
    assert.equal(h.element('psHourlyPanel').hidden, false);
    assert.equal(h.element('psRefresh').disabled, false);
    assert.equal(h.charts.size, 2);
  }
  // A long-window rejection falls back to the original shorter window for each interval.
  {
    const h = harness((path, params) => {
      if (path === '/sites') return sites;
      const days = daySpan(params);
      if (days === 180 || days === 7) throw new Error('window exceeds plan limit');
      return metrics();
    });
    await h.load();
    assert.deepEqual(h.requests.filter(r => r.interval === 'day').map(daySpan), [180, 30]);
    assert.deepEqual(h.requests.filter(r => r.interval === 'hour').map(daySpan), [7, 2]);
    assert.equal(h.charts.size, 2);
    assert.match(h.element('psDailyTitle').textContent, /disponibles/);
    assert.match(h.element('psHourlyTitle').textContent, /disponibles/);
  }
  // An omitted hour and an explicit zero-volume hour remain gaps, not connecting zeroes.
  {
    const h = harness((path, params) => path === '/sites' ? sites : params.interval === 'day' ? metrics() : metrics({
      moments: ['2020-05-01T00:00:00Z', '2020-05-01T02:00:00Z', '2020-05-01T03:00:00Z'],
      volumes: [10, 0, 10], counts: {Olea: [10, 20, 30]}
    }));
    await h.load();
    const chart = h.charts.get('pollenSenseHourlyChart');
    assert.deepEqual(Array.from(chart.data.datasets[0].data), [1, null, null, 3]);
    assert.equal(chart.data.datasets[0].spanGaps, false);
  }
  console.log('Passed: delayed daily data, independent hourly recovery, inactive filtering, zero versus no sampling, retry, query fallback, hourly gaps.');
})().catch(error => {console.error(error); process.exitCode = 1;});
