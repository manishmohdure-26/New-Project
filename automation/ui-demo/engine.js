#!/usr/bin/env node
/**
 * ui-demo/engine.js — turns a demo PLAN into a narrated MP4 (the Showcase agent's recorder).
 *
 *   node automation/ui-demo/engine.js <plan.js> [--dry-run] [--skip-dry-run] [--voice en-IN-PrabhatNeural] [--rate +8%]
 *
 * Pipeline
 *   0. DRY RUN   run every step once, fast, no recording — a broken step fails in ~1 minute, not after a full recording
 *   A. VOICE     one narration clip per step (edge-tts); clips are cached by text+voice+rate
 *   B. RECORD    real-time walkthrough with captions, spotlight and demo cursor; clean slate at every step
 *   C. MERGE     ffmpeg: video + each clip at its measured start time -> MP4. Sync is MEASURED, not guessed: a black
 *                sync flash is shown at the start and end of the recording, found in the video with blackdetect, and
 *                every clip is placed relative to it (also corrects any recording-clock drift between the two flashes)
 *   D. REVIEW    contact sheet of frames taken mid-action, for a visual check before delivery
 *
 * Plan file contract:
 *   module.exports = {
 *     meta: { slug, title, module, role, account, agency?, login: 'narrated' | 'silent', startPath? },
 *     steps: lib => [ { say, act?, then? }, ... ]   // ONE short phrase per action
 *   }
 *   act(h)  runs while its phrase is spoken, timed to the WORDS (edge-tts word boundaries):
 *           starts on the step's `at` word, else on the first action verb in the phrase (click, select, choose, open…),
 *           else ACT_LEAD ms after the voice. Inside act, `await h.at('Continue')` waits for a later word, so a
 *           two-action phrase ("choose X, and click Continue") does each action as it is said.
 *           h.type() fits its typing speed into the time left in the phrase.
 *   then(h) runs after the phrase — put NAVIGATION here and wait for the destination to render
 *
 * Outputs (never overwritten — the next free number is always used):
 *   outputs/ui-test-agent/<slug>/<slug>-demo-N.mp4 · narration-script-N.md · timeline-N.json · plan-N.js · frames-N/contact-sheet.png
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const lib = require('./lib');

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => {
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const planPath = args.find((a) => a.endsWith('.js'));
if (!planPath) {
  console.error(
    'usage: node engine.js <plan.js> [--dry-run] [--skip-dry-run] [--voice V] [--rate R]'
  );
  process.exit(2);
}

const VOICE = opt('--voice', process.env.DEMO_VOICE || 'en-IN-NeerjaNeural');
const RATE = opt('--rate', process.env.DEMO_RATE || '+8%');
const ACT_LEAD = 250,
  PAD = 120,
  GAP = 120;
const PARK = [6, 1074]; // empty bottom-left corner: no hover state left on any control
const VIEW = { width: 1920, height: 1080 };

const env = lib.loadEnv();
const plan = require(path.resolve(planPath));
const meta = plan.meta;
const STEPS = plan.steps({ ...lib, env });
const ROOT = path.resolve(lib.AUTOMATION_DIR, '..');
const OUT = path.join(ROOT, 'outputs', 'ui-test-agent', meta.slug);
fs.mkdirSync(OUT, { recursive: true });
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

async function openSession(recordDir) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: VIEW,
    ...(recordDir ? { recordVideo: { dir: recordDir, size: VIEW } } : {}),
  });
  await ctx.addInitScript(lib.OVERLAY);
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept().catch(() => {}));
  if (meta.login === 'silent') {
    await lib.login(page, env, meta);
    if (meta.startPath) {
      await page.goto(env.BASE_URL + meta.startPath);
      await page.waitForLoadState('networkidle');
    }
  } else {
    await page.goto(env.LOGIN_URL, { waitUntil: 'networkidle' });
  }
  return { browser, ctx, page };
}

const VERBS =
  /^(click|select|choose|open|pick|set|add|write|type|enter|check|mark|save|press|tap)$/i;
const norm = (w) =>
  String(w)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

async function runStep(page, h, s, speakMs, words = []) {
  const t0 = Date.now();
  let from = 0;
  // resolves just before `word` is spoken (the cursor's travel time lands the click on the word)
  h.at = async (word, leadMs = 150) => {
    const first = norm(String(word).split(' ')[0]);
    const i = words.findIndex((x, k) => k >= from && norm(x.w) === first);
    if (i < 0) return;
    from = i + 1;
    await lib.sleep(t0 + words[i].t * 1000 - leadMs - Date.now());
  };
  h.remaining = () => t0 + speakMs - Date.now();
  await page
    .evaluate((t) => {
      if (!window.__demo) return;
      window.__demo.hl(null);
      window.__demo.cursorHide(0);
      window.__demo.caption(t);
    }, s.say)
    .catch(() => {});
  await page.mouse.move(...PARK).catch(() => {});
  const cue = s.at || (words.find((x) => VERBS.test(norm(x.w))) || {}).w;
  await Promise.all([
    lib.sleep(speakMs),
    (async () => {
      if (!s.act) return;
      if (cue && words.length) await h.at(cue);
      else await lib.sleep(ACT_LEAD);
      await s.act(h);
    })(),
  ]);
  // a spotlight must never survive a page change (it would land on whatever sits there on the next screen)
  if (s.then) {
    await page.evaluate(() => window.__demo && window.__demo.hl(null)).catch(() => {});
    await s.then(h);
  }
}

// ---------------------------------------------------------------- 0. dry run
async function dryRun() {
  const { browser, page } = await openSession(null);
  const h = lib.makeHelpers(page, { typeDelay: 0 });
  const failures = [];
  for (let i = 0; i < STEPS.length; i++) {
    try {
      await runStep(page, h, STEPS[i], 150);
    } catch (e) {
      const shot = path.join(OUT, `dry-run-fail-step${i + 1}.png`);
      await page.screenshot({ path: shot }).catch(() => {});
      failures.push({ step: i + 1, say: STEPS[i].say, error: e.message.split('\n')[0], shot });
      console.log(`  ✗ step ${i + 1} "${STEPS[i].say}" — ${failures.at(-1).error}`);
      break; // later steps depend on earlier ones
    }
  }
  await browser.close();
  return failures;
}

// ---------------------------------------------------------------- A. voice
function tts() {
  const dir = path.join(OUT, 'clips');
  fs.mkdirSync(dir, { recursive: true });
  return STEPS.map((s) => {
    const f = path.join(
      dir,
      crypto
        .createHash('md5')
        .update(VOICE + RATE + s.say)
        .digest('hex')
        .slice(0, 16) + '.mp3'
    );
    if (!fs.existsSync(f) || !fs.existsSync(f + '.words.json'))
      execFileSync('python', [path.join(__dirname, 'tts.py'), VOICE, RATE, s.say, f], {
        stdio: 'ignore',
      });
    return {
      file: f,
      words: JSON.parse(fs.readFileSync(f + '.words.json', 'utf8')),
      dur: parseFloat(
        execFileSync('ffprobe', [
          '-v',
          'error',
          '-show_entries',
          'format=duration',
          '-of',
          'csv=p=0',
          f,
        ]).toString()
      ),
    };
  });
}

// ---------------------------------------------------------------- B. record
const FLASH_MS = 600;
// full-screen black for FLASH_MS; resolves with the wall-clock time the black frame was painted
async function syncFlash(page) {
  const t = await page.evaluate(
    (ms) =>
      new Promise((res) => {
        const d = document.createElement('div');
        d.style.cssText = 'position:fixed;inset:0;background:#000;z-index:2147483647';
        document.documentElement.appendChild(d);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            res(Date.now());
            setTimeout(() => d.remove(), ms);
          })
        );
      }),
    FLASH_MS
  );
  await lib.sleep(FLASH_MS + 300);
  return t;
}

async function record(clips) {
  const rawDir = path.join(OUT, 'raw');
  fs.rmSync(rawDir, { recursive: true, force: true });
  const t0 = Date.now();
  const { browser, ctx, page } = await openSession(rawDir);
  const h = lib.makeHelpers(page);
  const sync1 = await syncFlash(page);
  const timeline = [];
  for (let i = 0; i < STEPS.length; i++) {
    const start = (Date.now() - sync1) / 1000;
    timeline.push({ step: i + 1, start, dur: clips[i].dur, say: STEPS[i].say });
    try {
      if (process.env.DEMO_DEBUG) console.log(`  > step ${i + 1} ${new Date().toISOString().slice(11, 19)}`);
      const ms = clips[i].dur * 1000 + PAD;
      // watchdog: a step that runs 45 s past its phrase is stuck (a hung page call has no timeout of its own)
      let dog;
      await Promise.race([
        runStep(page, h, STEPS[i], ms, clips[i].words),
        new Promise((_, rej) => {
          dog = setTimeout(() => rej(new Error('step did not finish (watchdog)')), ms + 45000);
        }),
      ]).finally(() => clearTimeout(dog));
    } catch (e) {
      timeline[i].error = e.message.split('\n')[0];
      console.log(`  ! step ${i + 1}: ${timeline[i].error}`);
      // every later step depends on this one — stop now instead of letting each one sit out its timeout
      const shot = path.join(OUT, `record-fail-step${i + 1}.png`);
      await page.screenshot({ path: shot }).catch(() => {});
      await ctx.close().catch(() => {});
      await browser.close().catch(() => {});
      throw new Error(`recording stopped at step ${i + 1} ("${STEPS[i].say}"): ${timeline[i].error} — ${shot}`);
    }
    await lib.sleep(GAP);
  }
  await page
    .evaluate(() => {
      window.__demo.caption('');
      window.__demo.hl(null);
    })
    .catch(() => {});
  await lib.sleep(1000);
  const end = (Date.now() - sync1) / 1000;
  const sync2 = (await syncFlash(page)) - sync1;
  const vid = page.video();
  await ctx.close();
  await browser.close();
  return {
    video: await vid.path(),
    timeline,
    end,
    sync2: sync2 / 1000,
    launch: (sync1 - t0) / 1000,
  };
}

// video-time of every black flash
function findFlashes(video) {
  const r = require('child_process').spawnSync(
    'ffmpeg',
    ['-hide_banner', '-i', video, '-vf', 'blackdetect=d=0.3:pix_th=0.1', '-an', '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
  return [...r.stderr.matchAll(/black_start:([0-9.]+)/g)].map((m) => parseFloat(m[1]));
}

// wall seconds (since sync1) -> output seconds, from the two measured flashes
function syncMap(video, rec) {
  const f = findFlashes(video);
  if (f.length < 2) throw new Error(`sync flashes not found in the recording (found ${f.length})`);
  const b1 = f[0],
    b2 = f[f.length - 1];
  const scale = (b2 - b1) / rec.sync2;
  const ss = b1 + rec.timeline[0].start * scale;
  return {
    ss,
    len: b1 + rec.end * scale - ss,
    at: (w) => (w - rec.timeline[0].start) * scale,
    driftMs: Math.round((b2 - b1 - rec.sync2) * 1000),
    // how far off the old estimate (wall time since browser launch) would have been
    oldErrorMs: Math.round((rec.launch - b1) * 1000),
  };
}

// ---------------------------------------------------------------- C. merge
function merge(video, clips, timeline, sync, out) {
  const a = ['-y', '-ss', sync.ss.toFixed(3), '-t', sync.len.toFixed(3), '-i', video];
  clips.forEach((c) => a.push('-i', c.file));
  const parts = clips.map((c, i) => {
    const ms = Math.max(0, Math.round(timeline[i].start * 1000));
    return `[${i + 1}:a]adelay=${ms}|${ms}[a${i}]`;
  });
  const mix =
    clips.map((_, i) => `[a${i}]`).join('') +
    `amix=inputs=${clips.length}:normalize=0:duration=longest[aout]`;
  a.push(
    '-filter_complex',
    parts.join(';') + ';' + mix,
    '-map',
    '0:v',
    '-map',
    '[aout]',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '22',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '160k',
    '-avoid_negative_ts',
    'make_zero',
    out
  );
  execFileSync('ffmpeg', a, { stdio: 'ignore' });
}

// ---------------------------------------------------------------- D. review sheet
function contactSheet(video, timeline, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const withAct = timeline.filter((t, i) => STEPS[i].act);
  const pick = withAct
    .filter((_, i) => i % Math.max(1, Math.ceil(withAct.length / 12)) === 0)
    .slice(0, 12);
  pick.forEach((t, k) =>
    execFileSync('ffmpeg', [
      '-v',
      'error',
      '-y',
      '-ss',
      (t.start + Math.min(t.dur * 0.8, 3)).toFixed(2),
      '-i',
      video,
      '-frames:v',
      '1',
      '-vf',
      'scale=640:-1',
      path.join(dir, `f${String(k + 1).padStart(2, '0')}.png`),
    ])
  );
  execFileSync('ffmpeg', [
    '-v',
    'error',
    '-y',
    '-i',
    path.join(dir, 'f%02d.png'),
    '-vf',
    'tile=3x4:padding=6:color=white',
    '-frames:v',
    '1',
    path.join(dir, 'contact-sheet.png'),
  ]);
  return { sheet: path.join(dir, 'contact-sheet.png'), steps: pick.map((p) => p.step) };
}

(async () => {
  console.log(`Plan: ${meta.title} · role ${meta.role} · ${STEPS.length} phrases`);
  if (!flag('--skip-dry-run')) {
    console.log('0. Dry run');
    const f = await dryRun();
    if (f.length) {
      console.log(
        `DRY RUN FAILED at step ${f[0].step} — fix the plan before recording. Screenshot: ${f[0].shot}`
      );
      process.exit(1);
    }
    console.log('   all steps passed');
    if (flag('--dry-run')) return;
  }
  const n = lib.nextNumber(OUT, `${meta.slug}-demo`, 'mp4');
  const VIDEO = path.join(OUT, `${meta.slug}-demo-${n}.mp4`);
  if (fs.existsSync(VIDEO)) throw new Error(`refusing to overwrite ${VIDEO}`);
  console.log(`A. Voice (${VOICE}, ${RATE})`);
  const clips = tts();
  console.log('B. Recording');
  const rec = await record(clips);
  const { video } = rec;
  const sync = syncMap(video, rec);
  // timeline in output time: start of each clip exactly where its step began on screen
  const timeline = rec.timeline.map((t) => ({ ...t, start: +sync.at(t.start).toFixed(3) }));
  console.log(
    `C. Merging (sync measured: trim ${sync.ss.toFixed(2)}s, clock drift ${sync.driftMs} ms, old-method error ${sync.oldErrorMs} ms)`
  );
  merge(video, clips, timeline, sync, VIDEO);
  console.log('D. Review sheet');
  const review = contactSheet(VIDEO, timeline, path.join(OUT, `frames-${n}`));
  fs.copyFileSync(path.resolve(planPath), path.join(OUT, `plan-${n}.js`));
  fs.writeFileSync(
    path.join(OUT, `timeline-${n}.json`),
    JSON.stringify({ voice: VOICE, rate: RATE, timeline }, null, 2)
  );
  fs.writeFileSync(
    path.join(OUT, `narration-script-${n}.md`),
    `# ${meta.title} — Demo ${n}\n\nRole: ${meta.role} · Voice: ${VOICE} at ${RATE}. Ask for changes by step number.\n\n| Step | Time | Narration |\n|---|---|---|\n` +
      timeline
        .map((t) => `| ${t.step} | ${fmt(t.start)} | ${t.say}${t.error ? ' ⚠️ ' + t.error : ''} |`)
        .join('\n') +
      '\n'
  );
  const dur = parseFloat(
    execFileSync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      VIDEO,
    ]).toString()
  );
  const errors = timeline.filter((t) => t.error).length;
  console.log(
    JSON.stringify({
      video: VIDEO,
      duration: fmt(dur),
      sizeMB: +(fs.statSync(VIDEO).size / 1048576).toFixed(1),
      steps: STEPS.length,
      errors,
      reviewSheet: review.sheet,
      reviewSteps: review.steps,
    })
  );
  if (errors) process.exitCode = 1;
})().catch((e) => {
  console.error('FATAL', e.stack);
  process.exit(1);
});
