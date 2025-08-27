const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', 'artifacts', 'contracts', 'Escrow.sol', 'Escrow.json');
const destDir = path.resolve(__dirname, '..', 'web', 'src', 'abi');
const dest = path.join(destDir, 'Escrow.json');

function main() {
  if (!fs.existsSync(src)) {
    console.error('ABI not found at', src, '- have you run `npm run compile`?');
    process.exit(1);
  }
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log('Copied ABI to', dest);
}

main();
