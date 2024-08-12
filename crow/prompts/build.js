const fs = require('fs');
const path = require('path');

function readFile(filePath) {
  const content = fs.readFileSync(filePath);
  return content.toString();
}

function writeTo(dirPath, content) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }
  fs.writeFileSync(path.join(dirPath, './promptConfigs.json'), JSON.stringify(content, null, 2));
}

const prompts = [];

const promptDirs = fs
  .readdirSync(__dirname)
  .map((filename) => path.join(__dirname, filename))
  .filter((filePath) => fs.statSync(filePath).isDirectory());

for (const promptDir of promptDirs) {
  const manifest = JSON.parse(readFile(path.join(promptDir, './manifest.json')));
  const template = readFile(path.join(promptDir, manifest.template));
  prompts.push({ ...manifest, template });
}

const extensionDir = path.join(__dirname, '../src/prompts');
const webviewUIDir = path.join(__dirname, '../webview-ui/src/prompts');
writeTo(extensionDir, prompts);
writeTo(
  webviewUIDir,
  prompts.map((prompt) => {
    const { name, description, key, inputVariables, defaultValues, template } = prompt;
    const base = { name, description, key, template, isBuiltin: true, isFactory: false };
    if (inputVariables && defaultValues) {
      const emitDefaultVariables = inputVariables.filter(
        (v) => !defaultValues.find((kv) => kv.key === v),
      );
      if (emitDefaultVariables.length > 0) {
        return { ...base, inputVariables: emitDefaultVariables };
      }
      return base;
    }
    return { ...base, inputVariables };
  }),
);

console.log(
  '完成以下提示词模板构建',
  prompts.map((p) => p.key),
);
console.log('内容输出到目录:');
console.log([
  path.join(extensionDir, 'promptConfigs.json'),
  path.join(webviewUIDir, 'promptConfigs.json'),
]);
