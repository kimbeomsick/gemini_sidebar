import { cpSync, mkdirSync, existsSync } from 'fs';

const dist = 'dist';

mkdirSync(`${dist}/libs`, { recursive: true });
mkdirSync(`${dist}/icons`, { recursive: true });

cpSync('manifest.json', `${dist}/manifest.json`);
cpSync('content.css', `${dist}/content.css`);
cpSync('libs/marked.min.js', `${dist}/libs/marked.min.js`);
if (existsSync('icons')) cpSync('icons', `${dist}/icons`, { recursive: true });

console.log('Assets copied to dist/');
