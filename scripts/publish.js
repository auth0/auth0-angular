const fs = require('fs');
const exec = require('./exec');
const execSync = require('child_process').execSync;
const path = require('path');
const { syncBuiltinESMExports } = require('module');

if (!fs.existsSync('.release')) {
  console.error(`There's no release pending publication.`);
  process.exit(1);
}

const tmp = fs.readFileSync('.release', 'utf-8');
const versionFilePath = path.resolve(tmp, 'current-version');
const unpublishedFilePath = path.resolve(tmp, 'unpublished');

if (!fs.existsSync(unpublishedFilePath) || !fs.existsSync(versionFilePath)) {
  console.error(
    `The last release preparation did not complete successfully. Run 'npm run release:clean' and then 'npm run release' to start all over again.`
  );
  console.info(
    `If the Release PR was already merged into the base branch and only the npm publication is pending, manually run 'npm run build:prod' and then 'ALLOWED=true npm publish ./dist/auth0-angular'.`
  );
  process.exit(1);
}

const currentVersion = fs.readFileSync(versionFilePath, 'utf-8');

(async () => {
  console.log('Preparing the package for publication...');
  await exec(`git checkout v${currentVersion}`);

  /*
    The command below ensures the ./dist folder has prod-ready content.
    It will NOT regenerate the docs nor the useragent file, which
    should already be updated as part of the last tagged commit.
  */
  await exec('npm run build:prod');
  await exec('cp README.md ./dist/auth0-angular/');

  console.log('Uploading to npm, you might be prompted for the OTP...');

  execSync(`ALLOWED=true npm publish ./dist/auth0-angular`, {
    stdio: 'inherit',
  });

  console.log('Done!');
  await exec('npm run release:clean');
})();
