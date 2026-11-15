const fs = require('fs');
const content = fs.readFileSync('src/engine/questionGenerator.js', 'utf8');
const lines = content.split(/\r?\n/);
const keywords = ["pemadam", "buku", "pembaris", "ruler", "penimbang", "bikar", "beaker", "resit", "receipt", "football", "pecahan", "nilai digit", "pola"];
keywords.forEach(kw => {
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes(kw)) {
      console.log(`${kw} at L${idx+1}: ${line.trim().slice(0, 100)}`);
    }
  });
});
