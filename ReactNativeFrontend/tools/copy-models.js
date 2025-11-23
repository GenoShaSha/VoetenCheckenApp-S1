const fs = require('fs');
const path = require('path');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const srcModels = path.join(projectRoot, 'my_tfjs_models');
  const dest = path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets', 'my_tfjs_models');
  if (!fs.existsSync(srcModels)) {
    console.error('Source models folder not found:', srcModels);
    process.exit(1);
  }
  copyRecursive(srcModels, dest);
  console.log('Copied models to', dest);
}

main();
