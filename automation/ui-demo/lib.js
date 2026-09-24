/**
 * ui-demo/lib.js — shared building blocks for the UI test & demo agent (Showcase).
 *
 * - loadEnv()          reads automation/.env (credentials + URLs are never hardcoded)
 * - login()            signs in as an account, picks a role and (if asked) an agency
 * - OVERLAY            in-page captions, spotlight highlight and demo cursor
 * - makeHelpers()      click / type / pick / hl / scroll / drawer helpers used by plans
 *
 * Timing note: `sleep()` below is a plain timer used ONLY to pace the recording against the
 * narration audio. It never stands in for waiting on the UI — every UI wait uses Playwright
 * auto-waiting (`locator.waitFor`, `page.waitForURL`, actionability checks on click/fill).
 */
const path = require('path');
const fs = require('fs');

const AUTOMATION_DIR = path.resolve(__dirname, '..');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function loadEnv() {
  const file = path.join(AUTOMATION_DIR, '.env');
  if (!fs.existsSync(file))
    throw new Error(
      'automation/.env not found — add BASE_URL, LOGIN_URL and TEST_<ACCOUNT>_EMAIL/PASSWORD'
    );
  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2].trim().replace(/^['"]|['"]$/g, '')])
  );
}

/** credentials for an account key, e.g. 'CLINICIAN' -> TEST_CLINICIAN_EMAIL / TEST_CLINICIAN_PASSWORD */
function creds(env, account) {
  const email = env[`TEST_${account}_EMAIL`],
    password = env[`TEST_${account}_PASSWORD`];
  if (!email || !password)
    throw new Error(`TEST_${account}_EMAIL / TEST_${account}_PASSWORD missing in automation/.env`);
  return { email, password };
}

/**
 * Silent login (no narration). Handles an optional role-selection screen and an optional
 * agency-selection screen — some roles skip agency selection, so it is detected, not assumed.
 */
async function login(page, env, { account, role, agency }) {
  const { email, password } = creds(env, account);
  await page.goto(env.LOGIN_URL, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"], button:has-text("Sign In")').first().click();
  // wait until we have actually LEFT the login page — networkidle alone can fire before the redirect
  const loginPath = new URL(env.LOGIN_URL).pathname;
  await page.waitForURL((u) => new URL(u.toString()).pathname !== loginPath, { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  if (/select-role/.test(page.url()) && role) {
    await page.getByText(role, { exact: true }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForURL((u) => !/select-role/.test(u.toString()));
  }
  if (/select-agency/.test(page.url())) {
    if (agency) await page.getByText(agency, { exact: true }).click();
    else {
      const first = page.locator('[role="radio"], label').first();
      console.error(
        `no agency given — using the first option: "${(await first.innerText()).split('\n')[0]}"`
      );
      await first.click();
    }
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForURL((u) => !/select-agency/.test(u.toString()));
  }
  await page.waitForLoadState('networkidle');
}

// ---------------------------------------------------------------- in-page overlay
const OVERLAY = () => {
  window.__demo = {
    el(id, css) {
      let e = document.getElementById(id);
      if (!e) {
        e = document.createElement('div');
        e.id = id;
        e.style.cssText = css;
        document.documentElement.appendChild(e);
      }
      return e;
    },
    caption(t) {
      const c = this.el(
        '__cap',
        'position:fixed;left:50%;bottom:34px;transform:translateX(-50%);max-width:1400px;z-index:2147483647;pointer-events:none;background:rgba(15,23,42,.88);color:#fff;font:500 25px/1.45 Segoe UI,Arial,sans-serif;padding:14px 28px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.35);text-align:center'
      );
      c.textContent = t;
      c.style.opacity = t ? 1 : 0;
    },
    hl(b) {
      const h = this.el(
        '__hl',
        'position:fixed;z-index:2147483646;pointer-events:none;border:3px solid #F59E0B;border-radius:10px;box-shadow:0 0 0 9999px rgba(15,23,42,.20);transition:left .22s ease,top .22s ease,width .22s ease,height .22s ease,opacity .15s'
      );
      if (!b) {
        h.style.opacity = 0;
        return;
      }
      Object.assign(h.style, {
        left: b.x + 'px',
        top: b.y + 'px',
        width: b.w + 'px',
        height: b.h + 'px',
        opacity: 1,
      });
    },
    cursor(x, y) {
      const c = this.el(
        '__cur',
        'position:fixed;z-index:2147483647;pointer-events:none;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(37,99,235,.6);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4);transition:left .18s ease-out,top .18s ease-out,opacity .2s;left:960px;top:540px;opacity:0'
      );
      clearTimeout(this._t);
      c.style.opacity = 1;
      c.style.left = x + 'px';
      c.style.top = y + 'px';
    },
    cursorHide(ms) {
      const c = document.getElementById('__cur');
      if (!c) return;
      clearTimeout(this._t);
      this._t = setTimeout(() => {
        c.style.opacity = 0;
      }, ms || 0);
    },
  };
};

/**
 * Helpers handed to every plan step as `h`.
 * @param {import('playwright').Page} page
 * @param {{typeDelay?: number}} opts
 */
function makeHelpers(page, opts = {}) {
  const typeDelay = opts.typeDelay ?? 28;
  const box = async (loc) => {
    const l = loc.first();
    await l.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
    return l.boundingBox({ timeout: 3000 }).catch(() => null);
  };
  const overlay = (fn, arg) => page.evaluate(fn, arg).catch(() => {});

  const h = {
    page,
    sleep,
    /** spotlight one or more locators (union box); pass null to clear */
    async hl(...locs) {
      if (locs[0] === null) return overlay(() => window.__demo && window.__demo.hl(null));
      const bs = (await Promise.all(locs.map(box))).filter(Boolean);
      if (!bs.length) return;
      const x = Math.min(...bs.map((b) => b.x)) - 8,
        y = Math.min(...bs.map((b) => b.y)) - 8;
      const w = Math.max(...bs.map((b) => b.x + b.width)) + 8 - x,
        hh = Math.max(...bs.map((b) => b.y + b.height)) + 8 - y;
      return overlay((b) => window.__demo.hl(b), { x, y, w, h: hh });
    },
    async cursor(loc) {
      const b = await box(loc);
      if (!b) return;
      await overlay(
        ([x, y]) => window.__demo.cursor(x, y),
        [b.x + b.width / 2, b.y + b.height / 2]
      );
      await sleep(200);
    },
    async click(loc) {
      await h.cursor(loc);
      await loc.first().click({ timeout: 10000 });
      await overlay(() => window.__demo.cursorHide(500));
    },
    /** clears first — some fields arrive pre-populated and typing must never append */
    async type(loc, text) {
      await h.cursor(loc);
      await loc.first().click();
      await loc.first().fill('');
      // fit the typing into what is left of the phrase, so the text never keeps typing after the voice stops
      const left = h.remaining ? h.remaining() - 350 : Infinity;
      const delay = Math.max(6, Math.min(typeDelay, Math.floor(left / Math.max(1, text.length))));
      await loc.first().pressSequentially(text, { delay: typeDelay ? delay : 0 });
      await overlay(() => window.__demo.cursorHide(400));
    },
    /** open a role="combobox" control and choose an option by its exact visible name */
    async pick(combo, option) {
      await h.click(combo);
      const o = page.getByRole('option', { name: option, exact: true }).first();
      await o.waitFor({ timeout: 8000 });
      await h.cursor(o);
      await o.click();
      await overlay(() => window.__demo.cursorHide(400));
    },
    async scroll(total, ms) {
      await page.mouse.move(900, 600);
      const n = Math.max(8, Math.round(ms / 70));
      for (let i = 0; i < n; i++) {
        await page.mouse.wheel(0, total / n);
        await sleep(ms / n);
      }
    },
    /** right-edge side drawer (not role=dialog in many apps) */
    drawerRect() {
      return page
        .evaluate(() => {
          const W = innerWidth,
            H = innerHeight;
          const c = [...document.querySelectorAll('body *')]
            .map((e) => ({ e, r: e.getBoundingClientRect() }))
            .filter(
              ({ e, r }) =>
                r.height > H * 0.8 &&
                r.width > 300 &&
                r.width < W * 0.7 &&
                Math.abs(r.right - W) < 4 &&
                /fixed|absolute/.test(getComputedStyle(e).position)
            );
          if (!c.length) return null;
          const r = c.sort((a, b) => a.r.width - b.r.width).pop().r;
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        })
        .catch(() => null);
    },
    /** highlight whichever panel is open: side drawer or centred dialog */
    async hlDrawer() {
      const r = await h.drawerRect();
      if (r)
        return overlay((b) => window.__demo.hl(b), {
          x: r.x + 4,
          y: r.y + 4,
          w: r.w - 8,
          h: r.h - 8,
        });
      return h.hl(page.getByRole('dialog').filter({ visible: true }).last());
    },
    /** close whichever panel is open — its own close button first (Escape does not close every drawer) */
    async closePanel() {
      await h.hl(null);
      const dlg = page.getByRole('dialog').filter({ visible: true }).last();
      if (await dlg.count()) {
        const x = dlg
          .locator('button')
          .filter({ hasText: /^close$/i })
          .or(dlg.locator('button[aria-label*="close" i]'))
          .first();
        if (await x.count()) return h.click(x);
      }
      const r = await h.drawerRect();
      if (!r) return page.keyboard.press('Escape');
      const btn = await page.evaluate((d) => {
        const b = [...document.querySelectorAll('button,[role="button"]')]
          .map((e) => ({ e, r: e.getBoundingClientRect() }))
          .filter(
            ({ e, r }) =>
              r.width > 0 &&
              r.left >= d.x &&
              r.top < d.y + 90 &&
              r.right > d.x + d.w - 90 &&
              (e.querySelector('svg') || /close/i.test(e.getAttribute('aria-label') || ''))
          );
        return b.length
          ? { x: b[0].r.x + b[0].r.width / 2, y: b[0].r.y + b[0].r.height / 2 }
          : null;
      }, r);
      if (btn) await page.mouse.click(btn.x, btn.y);
      else await page.keyboard.press('Escape');
    },
  };
  return h;
}

/** Narrated login steps (one phrase per action) for plans that open on the login page. */
function narratedLogin(env, { account, role, agency }) {
  const { email, password } = creds(env, account);
  const steps = [
    {
      say: `We enter the ${role.toLowerCase()}'s email address,`,
      act: (h) => h.type(h.page.locator('input[type="email"]'), email),
    },
    {
      say: 'and the password,',
      act: (h) => h.type(h.page.locator('input[type="password"]'), password),
    },
    {
      say: 'and click Sign In.',
      act: (h) =>
        h.click(h.page.locator('button[type="submit"], button:has-text("Sign In")').first()),
      then: (h) => h.page.waitForURL(/select-role|provider|home/),
    },
    {
      say: `We select the ${role} role, and continue.`,
      act: async (h) => {
        if (!/select-role/.test(h.page.url())) return;
        await h.hl(h.page.getByText(role, { exact: true }).locator('xpath=../..'));
        await h.click(h.page.getByText(role, { exact: true }));
        await h.at('continue');
        await h.hl(null); // the next screen must not inherit this spotlight
        await h.click(h.page.getByRole('button', { name: 'Continue' }));
      },
      then: (h) => h.page.waitForURL((u) => !/select-role/.test(u.toString())),
    },
  ];
  if (agency) {
    steps.push({
      say: `We choose the ${agency.replace(/\bBH\b/, 'Behavioral Health')} agency, and continue.`,
      act: async (h) => {
        if (!/select-agency/.test(h.page.url())) return;
        await h.hl(h.page.getByText(agency, { exact: true }).locator('xpath=../..'));
        await h.click(h.page.getByText(agency, { exact: true }));
        await h.at('continue');
        await h.hl(null); // the next screen must not inherit this spotlight
        await h.click(h.page.getByRole('button', { name: 'Continue' }));
      },
      then: async (h) => {
        await h.page.waitForURL((u) => !/select-agency/.test(u.toString()));
        await h.page.waitForLoadState('networkidle');
      },
    });
  }
  return steps;
}

/** next free number for <prefix>-N.<ext> in dir — delivered outputs are never overwritten */
function nextNumber(dir, prefix, ext) {
  if (!fs.existsSync(dir)) return 1;
  const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)\\.${ext}$`);
  const nums = fs
    .readdirSync(dir)
    .map((f) => (f.match(re) || [])[1])
    .filter(Boolean)
    .map(Number);
  return nums.length ? Math.max(...nums) + 1 : 1;
}

module.exports = {
  AUTOMATION_DIR,
  sleep,
  loadEnv,
  creds,
  login,
  OVERLAY,
  makeHelpers,
  narratedLogin,
  nextNumber,
};
