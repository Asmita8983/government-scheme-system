const fs = require('fs');
const path = require('path');

// 1x1 pixel transparent PNG base64
const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const buffer = Buffer.from(base64Data, 'base64');

fs.writeFileSync(path.join(__dirname, '..', 'income_certificate.png'), buffer);
console.log('Dummy income_certificate.png successfully created! 🎉');
