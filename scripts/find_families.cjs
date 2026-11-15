const fs = require('fs');
const content = fs.readFileSync('src/engine/questionGenerator.js', 'utf8');
const lines = content.split(/\r?\n/);
lines.forEach((l, i) => {
  if (l.includes('TOPIC FAMILY') || l.includes('function geo_') || l.includes('function uk_')) {
    console.log(`L${i+1}: ${l}`);
  }
});
