const fs = require('fs');
const exec = require('./exec');
const path = require('path');
const { stderr } = require('process');

if (!fs.existsSync('.release')) {
  console.error(`There's no release pending publication.`);
  process.exit(1);
}

const tmp = fs.readFileSync('.release', 'utf-8');
const versionFilePath = path.resolve(tmp, 'current-version');
const unpublishedFilePath = path.resolve(tmp, 'unpublished');

if (!fs.existsSync(unpublishedFilePath) || !fs.existsSync(versionFilePath)) {
  console.error(
    `The last release preparation did not complete successfully. Run 'npm run release:clean' and then 'npm run release' again.`
  );
  process.exit(1);
}

const currentVersion = fs.readFileSync(versionFilePath, 'utf-8');

(async () => {
  //checkout the last tag
  console.log('Preparing the package for publication...');
  // await exec(`git checkout v${currentVersion}`);
  await exec('npm run build --prod');

  console.log('Uploading to npm, you might be prompted for the OTP...');
  await exec('ALLOWED=true npm run publish ./dist/auth0-angular --dry-run');

  console.log('Done! CLEAN THE FILES');

  // await exec('npm run release:clean');
})();
