import fs from 'fs';
import path from 'path';

const css = fs.readFileSync('src/app/globals.css', 'utf8');

// Find all keyframes in globals.css
const keyframes = [...css.matchAll(/@keyframes\s+([a-zA-Z0-9_-]+)/g)].map(m => m[1]);
console.log('Defined keyframes in globals.css:', keyframes);

// Find all animation utility classes
const animClasses = [...css.matchAll(/\.([a-zA-Z0-9_-]*animate[a-zA-Z0-9_-]*)/g)].map(m => m[1]);
console.log('Animation classes in globals.css:', [...new Set(animClasses)]);

// Now find occurrences of animation classes across components
function scanDir(dir) {
  let hits = {};
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      Object.assign(hits, scanDir(full));
    } else if (full.endsWith('.tsx')) {
      const content = fs.readFileSync(full, 'utf8');
      for (const cls of ['animate-page-enter', 'animate-card-enter', 'animate-modal-pop', 'animate-dropdown-slide', 'animate-fade-in', 'animate-checkmark-pop', 'theme-transitioning', 'active:scale']) {
        if (content.includes(cls)) {
          hits[cls] = (hits[cls] || 0) + 1;
        }
      }
    }
  }
  return hits;
}

console.log('\nAnimation class usages across src:', scanDir('src'));
