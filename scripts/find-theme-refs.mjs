import fs from 'fs';
import path from 'path';

function walk(dir) {
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      walk(full);
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('next-themes')) {
        console.log('next-themes in:', full);
      }
      if (content.includes('useCustomTheme')) {
        console.log('useCustomTheme in:', full);
      }
    }
  }
}

walk('src');
