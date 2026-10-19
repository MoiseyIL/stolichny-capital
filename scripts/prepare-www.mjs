// Собирает папку www для Android-приложения и кладёт шрифты внутрь, чтобы игра выглядела так же без интернета.
import fs from 'node:fs';
import path from 'node:path';

const out = 'www';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'icons'), { recursive: true });
for (const f of ['index.html', 'manifest.webmanifest']) fs.copyFileSync(f, path.join(out, f));
for (const f of fs.readdirSync('icons')) fs.copyFileSync(path.join('icons', f), path.join(out, 'icons', f));

let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
const link = html.match(/<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)">/);
if (link) {
  try {
    const ua = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
    let css = await (await fetch(link[1].replace(/&amp;/g, '&'), { headers: { 'User-Agent': ua } })).text();
    const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)\s]+/g) || [])];
    if (!urls.length) throw new Error('no font files in CSS');
    fs.mkdirSync(path.join(out, 'fonts'));
    let k = 0;
    for (const u of urls) {
      const name = `f${k++}.woff2`;
      const res = await fetch(u);
      if (!res.ok) throw new Error(`${res.status} for ${u}`);
      fs.writeFileSync(path.join(out, 'fonts', name), Buffer.from(await res.arrayBuffer()));
      css = css.split(u).join(name);
    }
    fs.writeFileSync(path.join(out, 'fonts', 'fonts.css'), css);
    html = html.replace(link[0], '<link rel="stylesheet" href="fonts/fonts.css">').replace(/<link rel="preconnect"[^>]*>\n?/g, '');
    console.log(`Fonts bundled: ${urls.length} files`);
  } catch (e) {
    console.log(`Fonts not bundled, the app will load them online: ${e.message}`);
  }
}
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('www is ready');
