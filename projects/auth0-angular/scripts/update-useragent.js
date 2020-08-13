const fs = require('fs');
const pkg = require('../package.json');

console.log(
  `Updating the "useragent.ts" file using name=${pkg.name} and version=${pkg.version}`
);
fs.writeFileSync(
  'projects/auth0-angular/src/useragent.ts',
  `export default { name: '${pkg.name}', version: '${pkg.version}' };
`
);
