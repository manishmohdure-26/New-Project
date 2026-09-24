#!/usr/bin/env node
/**
 * ui-demo/inventory.js — non-destructive screen mapper for the Showcase agent.
 *
 *   node automation/ui-demo/inventory.js --account CLINICIAN --role "Clinician" [--agency "…"] --path /provider/caseload
 *        [--click "Button name" ...]   open panels/dialogs first (each --click is a button/tab name, clicked in order)
 *        [--slug program-clinician] [--name caseload]
 *
 * Maps what is actually on the screen, the way a careful tester would:
 *   - expands collapsed sections ([aria-expanded="false"] that are not menus/comboboxes/links)
 *   - lists headings, tables (headers + row count), tabs, buttons (+disabled), links
 *   - lists every input/textarea with its label, placeholder, type and required flag
 *   - OPENS every role="combobox" control and records its full option list (then closes it)
 *   - counts radios/checkboxes per group
 * Never submits or saves anything. Output: outputs/ui-test-agent/<slug>/inventory/<name>.json + .png
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const lib = require('./lib');

const argv = process.argv.slice(2);
const one = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 ? argv[i + 1] : d;
};
const many = (n) => argv.flatMap((a, i) => (a === n ? [argv[i + 1]] : []));
// Git Bash on Windows rewrites "/route" into "C:/…/Git/route" — undo that, and accept "route" without a leading slash
const normalizeRoute = (p) => {
  if (!p) return p;
  const un = p.replace(/\\/g, '/').replace(/^[A-Za-z]:\/.*?\/Git(?=\/)/, '');
  return un.startsWith('/') ? un : '/' + un;
};
const account = one('--account'),
  role = one('--role'),
  agency = one('--agency'),
  startPath = normalizeRoute(one('--path'));
if (!account || !role || !startPath) {
  console.error(
    'usage: --account KEY --role "Role" --path /route [--agency "…"] [--click "Name"]... [--slug s] [--name n]'
  );
  process.exit(2);
}
const slug = one('--slug', 'adhoc'),
  name = one('--name', startPath.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'screen');
const OUT = path.join(lib.AUTOMATION_DIR, '..', 'outputs', 'ui-test-agent', slug, 'inventory');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const env = lib.loadEnv();
  const browser = await chromium.launch();
  const page = await (
    await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  ).newPage();
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  await lib.login(page, env, { account, role, agency });
  await page.goto(env.BASE_URL + startPath);
  await page.waitForLoadState('networkidle');

  for (const c of many('--click')) {
    // visible match only — responsive layouts often render a hidden duplicate of the same button
    const target = page
      .getByRole('button', { name: c, exact: true })
      .or(page.getByRole('tab', { name: c, exact: true }))
      .or(page.getByRole('menuitem', { name: c }))
      .filter({ visible: true })
      .first();
    try {
      await target.click({ timeout: 15000 });
    } catch (e) {
      const shot = path.join(OUT, `${name}-click-failed.png`);
      await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
      throw new Error(`could not click "${c}" — see ${shot}`);
    }
    await page.waitForLoadState('networkidle');
  }

  // expand collapsed sections — collapsed containers hide real controls and read as "missing"
  const expandable = page.locator(
    '[aria-expanded="false"]:not([role="combobox"]):not([aria-haspopup]):not(a)'
  );
  // skipped when a panel was opened with --click: clicking behind an open panel can close it
  const nExp = many('--click').length ? 0 : await expandable.count();
  // Resolve the elements ONCE per pass (a live .nth(i) re-queries a set that shrinks as sections open,
  // silently skipping some). Two passes catch toggles revealed by the first. Stop if a click navigates away.
  const startUrl = page.url();
  let expandedCount = 0;
  for (let pass = 0; pass < 2 && nExp > 0; pass++) {
    for (const el of await expandable.all()) {
      await el.click({ timeout: 2000 }).catch(() => {});
      if (page.url() !== startUrl) {
        console.error(
          `expansion navigated away (${page.url()}) — going back and stopping auto-expand`
        );
        await page.goBack();
        await page.waitForLoadState('networkidle');
        pass = 2;
        break;
      }
      expandedCount++;
    }
  }

  const scope = page.getByRole('dialog').filter({ visible: true });
  const inDialog = (await scope.count()) > 0;
  const root = inDialog ? scope.last() : page.locator('body');

  const data = await root.evaluate((r) => {
    const vis = (e) => {
      const b = e.getBoundingClientRect();
      return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden';
    };
    const txt = (e) => (e.innerText || e.textContent || '').trim().replace(/\s+/g, ' ');
    const labelFor = (el) => {
      if (el.id) {
        const l = r.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (l) return txt(l).replace(/\s*\*$/, '');
      }
      const wrap = el.closest('label');
      if (wrap) return txt(wrap);
      return el.getAttribute('aria-label') || '';
    };
    return {
      headings: [...r.querySelectorAll('h1,h2,h3,h4,h5,h6,legend')]
        .filter(vis)
        .map(txt)
        .filter(Boolean),
      tabs: [...r.querySelectorAll('[role="tab"]')]
        .filter(vis)
        .map((e) => ({ name: txt(e), selected: e.getAttribute('aria-selected') === 'true' })),
      tables: [...r.querySelectorAll('table')].filter(vis).map((t) => ({
        headers: [...t.querySelectorAll('thead th')].map(txt).filter(Boolean),
        rows: t.querySelectorAll('tbody tr').length,
      })),
      buttons: [
        ...new Set(
          [...r.querySelectorAll('button:not([role="combobox"]),[role="button"]')]
            .filter(vis)
            .map(
              (b) =>
                txt(b) +
                (b.disabled || b.getAttribute('aria-disabled') === 'true' ? ' [disabled]' : '')
            )
            .filter((s) => s && s.length < 60)
        ),
      ],
      links: [
        ...new Set(
          [...r.querySelectorAll('a[href]')]
            .filter(vis)
            .map((a) => txt(a))
            .filter((s) => s && s.length < 60)
        ),
      ],
      fields: [
        ...r.querySelectorAll(
          'input:not([type=hidden]):not([type=radio]):not([type=checkbox]),textarea'
        ),
      ]
        .filter(vis)
        .filter((el) => el.getAttribute('aria-hidden') !== 'true' && el.tabIndex !== -1) // skip combobox helper inputs
        .map((el) => ({
          label: labelFor(el),
          placeholder: el.getAttribute('placeholder') || '',
          type: el.tagName === 'TEXTAREA' ? 'textarea' : el.type || 'text',
          required:
            el.required || el.getAttribute('aria-required') === 'true' || /\*/.test(labelFor(el)),
          disabled: el.disabled,
          value: el.value ? '(has value)' : '',
        })),
      choiceGroups: Object.entries(
        [...r.querySelectorAll('input[type=radio],input[type=checkbox]')]
          .filter(vis)
          .reduce((g, el) => {
            const k = `${el.type}:${el.name || '(unnamed)'}`;
            g[k] = (g[k] || 0) + 1;
            return g;
          }, {})
      ).map(([k, n]) => ({ group: k, count: n })),
      comboboxes: [...r.querySelectorAll('[role="combobox"]')]
        .filter(vis)
        .map((el, i) => ({ index: i, label: labelFor(el), shows: txt(el) })),
    };
  });

  // open every combobox and read its full option list
  const combos = root.getByRole('combobox');
  for (const c of data.comboboxes) {
    try {
      await combos.nth(c.index).click({ timeout: 4000 });
      await page.getByRole('option').first().waitFor({ timeout: 3000 });
      c.options = await page.getByRole('option').allInnerTexts();
    } catch {
      c.options = '(could not open — may need a prior value, or it is a free-text autocomplete)';
    }
    await page.keyboard.press('Escape');
  }

  const result = {
    url: page.url().replace(env.BASE_URL, ''),
    role,
    inDialog,
    expandedSections: expandedCount,
    ...data,
  };
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(result, null, 2));
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: !inDialog });
  await browser.close();
  console.log(
    JSON.stringify({
      saved: path.join(OUT, `${name}.json`),
      url: result.url,
      inDialog,
      tables: data.tables.length,
      fields: data.fields.length,
      comboboxes: data.comboboxes.length,
      buttons: data.buttons.length,
    })
  );
})().catch((e) => {
  console.error('FATAL', e.message.split('\n')[0]);
  process.exit(1);
});
