const fs = require('fs');
const pkg = require('../package.json');

fs.writeFileSync(
  'projects/auth0-angular/src/useragent.ts',
  `export default { name: '${pkg.name}', version: '${pkg.version}' };
`
);
