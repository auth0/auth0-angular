const ALLOWED = !!process.env.ALLOWED;

if (!ALLOWED) {
  console.log('Run `npm run release:publish` to publish the package');
  process.exit(1); //which terminates the publish process
}
