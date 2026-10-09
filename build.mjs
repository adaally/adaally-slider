// Build: compile TS with tsc, then produce a UMD bundle from the ESM output.
// Emits: dist/adaally-slider.esm.js, .umd.js, .d.ts, .css
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = 'dist';
const SRC_CSS = 'src/adaally-slider.css';

// 1. Compile TypeScript
execSync('npx --yes -p typescript@5 tsc', { stdio: 'inherit' });

// 2. tsc emits dist/adaally-slider.js — rename to .esm.js
const tscJs = path.join(OUT, 'adaally-slider.js');
const esmJs = path.join(OUT, 'adaally-slider.esm.js');
const umdJs = path.join(OUT, 'adaally-slider.umd.js');

const source = await fs.readFile(tscJs, 'utf8');
await fs.rename(tscJs, esmJs);

// 3. Strip ESM export statements and wrap in UMD
const stripped = source
  .replace(/^export default \w+;?\s*$/gm, '')
  .replace(/^export \{[^}]*\};?\s*$/gm, '')
  .replace(/^export /gm, '');

const umd = `/*! Adaally Slider — MIT — vanilla JS carousel built to support WCAG 2.1 AA */
(function (global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    var api = factory();
    global.Adaally = global.Adaally || {};
    global.Adaally.Slider = api.AdaallySlider;
    global.Adaally.autoInit = api.autoInit;
    global.AdaallySlider = api.AdaallySlider;
  }
})(typeof self !== 'undefined' ? self : this, function () {
${stripped}
  return { AdaallySlider: AdaallySlider, autoInit: autoInit };
});
`;

await fs.writeFile(umdJs, umd);
await fs.copyFile(SRC_CSS, path.join(OUT, 'adaally-slider.css'));

console.log('Built:');
console.log('  dist/adaally-slider.esm.js');
console.log('  dist/adaally-slider.umd.js');
console.log('  dist/adaally-slider.d.ts');
console.log('  dist/adaally-slider.css');
