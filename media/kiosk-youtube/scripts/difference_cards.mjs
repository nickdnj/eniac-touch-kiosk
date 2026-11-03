// Run from the kiosk repo's src/web (so @playwright/test resolves): node <this file> <output dir>
import { createRequire } from "node:module";
const { chromium } = createRequire(process.cwd() + "/x.js")("@playwright/test"); // resolved from the cwd (the kiosk's src/web)
const OUT = process.argv[2];
const css = `body{margin:0;width:1920px;height:1080px;background:#0e1013;color:#f2ede1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;font-family:'Helvetica Neue',Arial,sans-serif;text-align:center}
h1{font-size:96px;margin:0;letter-spacing:.05em;color:#e8dcb5}p{font-size:40px;margin:0;max-width:1400px;line-height:1.35;color:#cfc8b6}small{font-size:28px;color:#8f8a7e}`;
const cards = {
 title: `<h1>ENIAC builds a table</h1><p>Mission 4: Difference<br>by adding, the way Babbage planned</p><small>ENIAC touch-screen exhibit · Vintage Computer Federation, InfoAge</small>`,
 end: `<h1>Thank you</h1><p>Simulator and program by Brian L. Stuart, Drexel University<br>Tutorial: “Polynomial Tables on the ENIAC”<br>github.com/blstuart/eniac-simulator</p><small>ENIAC touch-screen exhibit · Vintage Computer Federation museum · review cut, not final</small>`,
};
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
for (const [k, html] of Object.entries(cards)) {
  await p.setContent(`<style>${css}</style>${html}`);
  await p.screenshot({ path: `${OUT}/${k}.png` });
}
await b.close();
