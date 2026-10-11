/**
 * Owner-test driver (v1.4 part 3) — a persistent Chromium at phone size that a
 * tester drives one command at a time over a local HTTP port, counting one tap
 * per command that an owner would tap for. Rebuilt from the part-2 owner test's
 * scratchpad driver (lost with that session); same command names and the same
 * tap rule: goto / tap / fill / select count 1, everything else 0.
 *
 *   node progress/v14/owner-test/driver/server.mjs [--port 4321] [--width 390 --height 844] [--shots DIR] [--journal FILE] [--persona NAME]
 *   node progress/v14/owner-test/driver/do.mjs <cmd> '<json args>'
 *
 * Commands (args as JSON): goto {url} · tap {text, nth?, role?} · fill {label, value} ·
 * select {label, option} · check {label} · press {key} · scroll {dy} · see {} (visible text) ·
 * options {label} · shot {name} · taps {} · resetTaps {} · box {text, nth?} (bounding box of
 * the first visible match) · boxes {selector} · eval {js} · persona {name} · quit {}.
 * Playwright comes from /opt/node-tools (pre-installed), Chromium from /opt/pw-browsers.
 */
import { createServer } from "node:http";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");

const args = Object.fromEntries(
  process.argv.slice(2).reduce((out, a, i, all) => (a.startsWith("--") ? [...out, [a.slice(2), all[i + 1]]] : out), []),
);
const PORT = Number(args.port ?? 4321);
const WIDTH = Number(args.width ?? 390);
const HEIGHT = Number(args.height ?? 844);
const SHOTS = args.shots ?? "progress/v14/owner-test";
const JOURNAL = args.journal ?? "progress/v14/owner-test/journal-p3.txt";
let persona = args.persona ?? "abu-fahd";
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2,
  isMobile: WIDTH < 768,
  hasTouch: WIDTH < 768,
  locale: "ar-SA",
  timezoneId: "Asia/Riyadh",
  reducedMotion: "no-preference",
});
const page = await context.newPage();
page.setDefaultTimeout(5000);
let taps = 0;
let shotNo = 0;

const visible = (loc) => loc.filter({ visible: true });
/**
 * What an owner can tap: inside an open modal (<dialog open>) first — the page
 * behind it is inert — else the page. A role match (button/link) beats a bare
 * text match, and an exact match beats a loose one.
 */
async function candidates(text, nth = 0, role) {
  const scope = (await page.locator("dialog[open]").count()) ? page.locator("dialog[open]").last() : page;
  const list = [];
  const roles = role ? [role] : ["button", "link"];
  for (const r of roles) {
    list.push(scope.getByRole(r, { name: text, exact: true }));
    list.push(scope.getByRole(r, { name: text }));
  }
  list.push(scope.getByText(text, { exact: true }), scope.getByText(text));
  for (const loc of list) {
    const v = visible(loc);
    if ((await v.count()) > nth) return v.nth(nth);
  }
  return null;
}
async function clickText(text, nth, role) {
  const loc = await candidates(text, nth, role);
  if (!loc) throw new Error(`nothing visible on screen matches «${text}»`);
  return loc.click();
}
async function labelled(label) {
  const exact = visible(page.getByLabel(label, { exact: true }));
  if (await exact.count()) return exact.first();
  const loose = visible(page.getByLabel(label));
  if (await loose.count()) return loose.first();
  throw new Error(`no visible field labelled «${label}»`);
}
async function settle() {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForTimeout(350);
}

const commands = {
  async goto({ url }) { taps++; await page.goto(url); await settle(); return `at ${page.url()}`; },
  async tap({ text, nth, role }) { taps++; await clickText(text, nth ?? 0, role); await settle(); return `tapped «${text}»`; },
  async fill({ label, value }) { taps++; const f = await labelled(label); await f.fill(String(value)); return `filled «${label}»`; },
  async select({ label, option }) { taps++; const f = await labelled(label); await f.selectOption({ label: option }); await settle(); return `selected «${option}» in «${label}»`; },
  async check({ label }) { taps++; const f = await labelled(label); await f.check(); await settle(); return `checked «${label}»`; },
  async press({ key }) { await page.keyboard.press(key); await settle(); return `pressed ${key}`; },
  async scroll({ dy }) { await page.mouse.wheel(0, Number(dy)); await page.waitForTimeout(200); return `scrolled ${dy}`; },
  async see() { return (await page.locator("body").innerText()).replace(/\n{3,}/g, "\n\n").slice(0, 6000); },
  async options({ label }) { const f = await labelled(label); return (await f.locator("option").allInnerTexts()).join(" | "); },
  async shot({ name }) {
    shotNo++;
    const file = path.join(SHOTS, `${persona}-${String(shotNo).padStart(3, "0")}-${name}.jpg`);
    await page.screenshot({ path: file, type: "jpeg", quality: 70, fullPage: false });
    return file;
  },
  async taps() { return `taps=${taps}`; },
  async resetTaps() { taps = 0; return "taps=0"; },
  async box({ text, nth, role }) {
    const loc = await candidates(text, nth ?? 0, role);
    if (!loc) throw new Error(`nothing visible on screen matches «${text}»`);
    return JSON.stringify(await loc.boundingBox());
  },
  async boxes({ selector }) {
    const out = [];
    for (const el of await page.locator(selector).all()) out.push(await el.boundingBox());
    return JSON.stringify(out);
  },
  async eval({ js }) { return JSON.stringify(await page.evaluate(js)); },
  async persona({ name }) { persona = name; shotNo = 0; taps = 0; return `persona=${name}`; },
  async url() { return page.url(); },
  async quit() { setTimeout(() => process.exit(0), 100); return "bye"; },
};

const server = createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  const { cmd, args: a = {} } = JSON.parse(body || "{}");
  let result;
  let ok = true;
  try {
    if (!commands[cmd]) throw new Error(`unknown command ${cmd}`);
    result = await commands[cmd](a);
  } catch (e) {
    ok = false;
    result = String(e.message || e).split("\n")[0];
  }
  const logged = { ...a };
  if (logged.value && /password|كلمة/.test(String(a.label))) logged.value = "<password>";
  appendFileSync(JOURNAL, `${new Date().toISOString()} [${persona}] taps=${taps} ${ok ? cmd : "ERROR"} ${JSON.stringify(ok ? logged : { cmd, ...logged })} → ${result}\n`);
  res.writeHead(ok ? 200 : 400, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok, result, taps }));
});
server.listen(PORT, "127.0.0.1", () => console.log(`driver listening on ${PORT}, ${WIDTH}×${HEIGHT}, persona ${persona}`));
