// Each cloud function is deployed separately, so it needs its own auth.js.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const template = fs.readFileSync(path.join(__dirname, 'cloud-auth-template.js'));
for (const folder of fs.readdirSync(path.join(root, 'cloudfunctions'))) {
  const target = path.join(root, 'cloudfunctions', folder);
  if (folder !== 'getOpenId' && fs.existsSync(path.join(target, 'index.js'))) {
    fs.writeFileSync(path.join(target, 'auth.js'), template);
  }
}
console.log('Cloud function auth helpers synchronized.');
