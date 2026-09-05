import fs from 'fs';

let content = fs.readFileSync('src/pages/Settings.jsx', 'utf8');
let lines = content.split('\n');
lines.splice(628, 40); // removes line 629 to 668 (index 628 is line 629)
fs.writeFileSync('src/pages/Settings.jsx', lines.join('\n'));
