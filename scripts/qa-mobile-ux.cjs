/* Local browser QA of the packaged SPA. Requests are mocked; no live accounts are modified. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

exports.start = async function (chromium) {
  const root = path.resolve(__dirname, '../dist/mobile/browser');
  const output = path.resolve(__dirname, '../dist/qa/mobile-redesign');
  fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((req, res) => {
    let file = path.join(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
      file = path.join(root, 'index.html');
    const mime = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2',
    };
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    let data = fs.readFileSync(file);
    // Override only tour eligibility; the rest of Capacitor stays in its browser environment.
    if (path.extname(file) === '.js')
      data = data
        .toString()
        .replace(
          /(`Mobile intro platform`,\{providedIn:`root`,factory:\(\)=>)[\w$]+\.isNativePlatform\(\)/,
          '$1true',
        );
    res.end(data);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
  });
  const requests = [];
  const errors = [];
  let loginAttempts = 0;
  await context.route('**/api/v1/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url()).pathname;
    requests.push({
      method: request.method(),
      path: url,
      body: request.method() === 'POST' ? request.postDataJSON() : undefined,
    });
    let body = { count: 0, results: [], next: null, previous: null };
    let status = 200;
    if (url.endsWith('/config/'))
      body = {
        default_country: 'SZ',
        default_currency: 'SZL',
        supported_currencies: ['SZL'],
        features: {
          properties: true,
          stays: true,
          bookings: true,
          registration: true,
          internal_messaging: true,
        },
        map: { default_latitude: -26.5, default_longitude: 31.4, default_zoom: 8 },
        footer: { navigation_groups: [], social_links: [], newsletter: { enabled: false } },
      };
    if (url.endsWith('/reference/'))
      body = {
        property_types: [],
        property_amenities: [],
        stay_amenities: [],
        listing_types: [],
        stay_types: [],
        regions: [],
        countries: [],
        currencies: [],
        verification_types: [],
      };
    if (url.endsWith('/auth/login/')) {
      loginAttempts++;
      if (loginAttempts === 1) {
        status = 401;
        body = { code: 'invalid_credentials', message: 'Invalid credentials' };
      } else body = { access: 'qa-access', refresh: 'qa-refresh' };
    }
    if (url.endsWith('/auth/me/'))
      body = {
        id: 'qa-user',
        email: 'qa@example.com',
        first_name: 'QA',
        last_name: 'Tester',
        is_staff: false,
        is_email_verified: true,
        onboarding_intents: ['LOOKING_FOR_PROPERTY'],
      };
    if (url.endsWith('/auth/capabilities/'))
      body = {
        has_individual_property_context: false,
        has_individual_stay_context: false,
        has_agent_profile: false,
        has_agency_management_context: false,
        can_manage_agency: false,
        agency_count: 0,
      };
    if (url.endsWith('/auth/register/')) {
      status = 201;
      body = { email_verification_required: true, user: { email: 'qa@example.com' } };
    }
    if (url.includes('password-reset'))
      body = { detail: 'If applicable, instructions will be sent.' };
    await route.fulfill({ status, json: body });
  });
  await context.addInitScript(() => {
    localStorage.setItem('sureplace.mobile-intro.v1', 'complete');
    localStorage.setItem(
      'sureplace-cookie-preferences',
      JSON.stringify({ functional: false, analytics: false, marketing: false }),
    );
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  async function visit(route) {
    await page.goto(base + route, { waitUntil: 'load', timeout: 15000 });
    await page.locator('main h1').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
  }
  async function overflow(label) {
    const size = await page.evaluate(() => ({
      width: innerWidth,
      actual: document.documentElement.scrollWidth,
    }));
    if (size.actual > size.width + 1)
      throw new Error(`${label}: horizontal overflow ${JSON.stringify(size)}`);
  }
  return {
    browser,
    context,
    page,
    base,
    output,
    requests,
    errors,
    visit,
    overflow,
    close: async () => {
      await browser.close();
      await new Promise((resolve) => server.close(resolve));
    },
  };
};
