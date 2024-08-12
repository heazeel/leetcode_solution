const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

execSync('rsbuild build', { stdio: 'inherit' });
const distPath = path.resolve(__dirname, '../dist');
const manifest = fs.readFileSync(path.resolve(distPath, 'manifest.json'));
const manifestObj = JSON.parse(manifest);

const entries = manifestObj.entries;
Object.keys(entries).forEach((key) => {
  let jsContent = '';
  let cssContent = '';
  const js = entries[key].initial.js || [];
  const jsAsync = entries[key].async.js || [];
  const jsArr = [...js, ...jsAsync];
  const cssArr = entries[key].initial.css;
  jsArr.forEach((file) => {
    jsContent += `import '..${file}';\n`;
  });

  cssArr.forEach((file) => {
    cssContent += fs.readFileSync(path.resolve(distPath, `.${file}`));
  });

  const dirPath = path.resolve(distPath, key);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  fs.writeFileSync(path.resolve(dirPath, 'main.js'), jsContent);
  fs.writeFileSync(path.resolve(dirPath, 'main.css'), cssContent);
});
