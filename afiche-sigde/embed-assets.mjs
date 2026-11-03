import { readFile, writeFile } from 'node:fs/promises';

const svgPath = new URL('./afiche-sigde-33x70cm.svg', import.meta.url);
const backgroundPath = new URL('./assets/sigde-poster-background.png', import.meta.url);
const logoPath = new URL('./assets/Logo-login.png', import.meta.url);

let svg = await readFile(svgPath, 'utf8');
const background = `data:image/png;base64,${(await readFile(backgroundPath)).toString('base64')}`;
const logo = `data:image/png;base64,${(await readFile(logoPath)).toString('base64')}`;

svg = svg
  .replace('assets/sigde-poster-background.png', background)
  .replace('assets/Logo-login.png', logo);

await writeFile(svgPath, svg);
