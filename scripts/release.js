const fs = require('fs');
const exec = require('./exec');
const writeChangelog = require('./changelog');
const path = require('path');
const tmp = fs.mkdtempSync(`.release-tmp-`);
const libPkg = require('../projects/auth0-angular/package.json');

if (!fs.existsSync('.release')) {
  fs.writeFileSync('.release', tmp);
} else {
  console.error('Found a pending release. Please run `npm run release:clean`');
  process.exit(1);
}

const newVersion = process.argv[2];
if (!newVersion) {
  throw new Error('usage: `release new_version [branch]`');
}

var lastVersionFile = path.resolve(tmp, 'current-version');
fs.writeFileSync(lastVersionFile, libPkg.version);

const branch = process.argv[3];

(async () => {
  if (branch) {
    await exec(`git checkout ${branch}`);
  }

  await exec('git pull');
  await exec(`git checkout -b prepare/${newVersion}`);

  const newReadme = fs
    .readFileSync('./README.md')
    .toString()
    .replace(libPkg.version, newVersion);

  fs.writeFileSync('./README.md', newReadme);

  fs.writeFileSync(
    './projects/auth0-angular/package.json',
    JSON.stringify({ ...libPkg, version: newVersion }, null, 2)
  );

  /*
  This will take care of:
    1. Updating the user agent version
    2. Build the app and ensure there are no errors.
    3. Generating the docs
  */
  console.log('Building the library...');
  await exec('npm run build');

  console.log('Fetching the next version changelog...');
  await writeChangelog(newVersion);

  console.log('Committing files and creating the tag...');
  await exec('git add ./projects/auth0-angular/package.json');
  await exec('git add ./projects/auth0-angular/src/useragent.ts');
  await exec('git add ./README.md');
  await exec('git add ./CHANGELOG.md');
  await exec('git add ./docs/');
  await exec(`git commit -am 'Release v${newVersion}'`);
  await exec(`git tag v${newVersion}`);

  console.log('Done! Pushing the tag to Github...');
  await exec(`git push --tags`);

  await exec('npm run release:clean');
})();
