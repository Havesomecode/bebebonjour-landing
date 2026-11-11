// Local synthetic journey only. Pass the installed Playwright package path.
const {chromium} = require(process.argv[2]);
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const base = 'http://127.0.0.1:8794';
  const browser = await chromium.launch({executablePath: '/usr/bin/brave-browser', headless: true, args: ['--no-sandbox']});
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
  const errors = [], external = [], requests = [], pages = [], announcementParity = [];
  await context.route('**/*', route => {
    const request = route.request();
    requests.push({url: request.url(), method: request.method()});
    if (new URL(request.url()).origin !== base) {
      external.push(request.url());
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
  fs.mkdirSync('.evidence', {recursive: true});
  try {
    const response = await page.goto(base, {waitUntil: 'networkidle'});
    assert.equal(response.status(), 200);
    assert.equal(await page.locator('a[href="/delivery"]').count(), 4);
    assert.equal(await page.locator('form').count(), 0);
    pages.push({path: '/', title: await page.title(), heading: await page.locator('h1').innerText()});
    await page.screenshot({path: '.evidence/landing.png', fullPage: true});
    const questions = page.locator('details');
    assert.equal(await questions.count(), 5);
    for (let index = 0; index < await questions.count(); index++) {
      const question = questions.nth(index);
      await question.locator('summary').click();
      assert.equal(await question.getAttribute('open'), '');
      assert.ok((await question.locator('p').innerText()).length > 20);
      await question.locator('summary').click();
      assert.equal(await question.getAttribute('open'), null);
    }
    await page.goto(base + '/demo', {waitUntil: 'networkidle'});
    await page.waitForFunction(() => document.querySelector('#baby-name').textContent === 'Amal');
    const initial = await page.locator('#step-count').innerText();
    const journeys = [];
    for (const profile of ['amal', 'bayane']) {
      await page.selectOption('#profile-select', profile);
      let advances = 0;
      while (await page.locator('#advance-demo').isVisible()) {
        assert.ok(advances++ < 20, 'Synthetic playback did not finish');
        await page.click('#advance-demo');
      }
      const link = await page.locator('#announcement-link').getAttribute('href');
      assert.equal(link, `./demo/announcements/${profile}/fr/`);
      journeys.push({profile, advances, completed: await page.locator('#step-count').innerText(), link});
    }
    await page.click('#reset-demo');
    assert.equal(await page.locator('#step-count').innerText(), initial);
    assert.equal(await page.locator('#baby-name').innerText(), 'Amal');
    assert.equal(await page.locator('#profile-select').inputValue(), 'amal');
    assert.equal(await page.locator('#announcement-link').isVisible(), false);
    await page.screenshot({path: '.evidence/demo.png', fullPage: true});
    assert.deepEqual(errors, [], 'Landing/demo must have no browser errors');
    const publishedContext = await browser.newContext({viewport: {width: 1440, height: 1000}});
    const published = await publishedContext.newPage();
    const publishedErrors = [];
    published.on('pageerror', error => publishedErrors.push(error.message));
    published.on('console', message => {if (message.type() === 'error') publishedErrors.push(message.text());});
    await publishedContext.route('**/*', route => {
      if (new URL(route.request().url()).origin !== 'https://www.bebebonjour.com') {
        external.push(route.request().url());
        return route.abort();
      }
      return route.continue();
    });
    for (const profile of ['amal', 'bayane']) {
      for (const language of ['fr', 'ar']) {
        const path = `/demo/announcements/${profile}/${language}/`;
        const response = await page.goto(base + path, {waitUntil: 'networkidle'});
        assert.equal(response.status(), 200);
        const sourceResponse = await published.goto('https://www.bebebonjour.com' + path, {waitUntil: 'networkidle'});
        assert.equal(sourceResponse.status(), 200);
        assert.equal(await page.locator('#story .story-section').count(), 6);
        const snapshot = async p => ({title: await p.title(), language: await p.locator('html').getAttribute('lang'), text: await p.locator('body').innerText()});
        const local = await snapshot(page), publicPage = await snapshot(published);
        assert.deepEqual(local, publicPage, `Announcement rendering differs: ${path}`);
        announcementParity.push({path, local, published: publicPage});
        pages.push({path, title: local.title, language: local.language});
      }
    }
    await page.goto(base + '/demo/announcements/bayane/fr/', {waitUntil: 'networkidle'});
    await published.goto('https://www.bebebonjour.com/demo/announcements/bayane/fr/', {waitUntil: 'networkidle'});
    await page.screenshot({path: '.evidence/announcement.png', fullPage: true});
    await published.screenshot({path: '.evidence/announcement-published.png', fullPage: true});
    await page.setViewportSize({width: 390, height: 844});
    await page.goto(base, {waitUntil: 'networkidle'});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({path: '.evidence/landing-mobile.png', fullPage: true});
    assert.deepEqual(errors, publishedErrors, 'No new announcement browser errors are allowed');
    assert.equal(errors.length, 5);
    assert.ok(errors.every(error => error.startsWith("Executing inline script violates the following Content Security Policy directive 'script-src 'self''.")));
    assert.deepEqual(external, []);
    assert.ok(requests.every(request => request.method === 'GET'));
    const receipt = {checked_at: new Date().toISOString(), browser: await browser.version(), pages, journeys, reset: true, mobile_overflow: false, errors, publishedErrors, announcementParity, external, requests};
    fs.writeFileSync('.evidence/browser.json', JSON.stringify(receipt, null, 2) + '\n');
    console.log(JSON.stringify({pages: pages.length, journeys, reset: true, inherited_csp_refusals: errors.length, new_errors: 0, external, request_count: requests.length}, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
