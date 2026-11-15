const fs = require('fs');
const content = fs.readFileSync('src/components/visuals/QuestionVisualFigure.jsx', 'utf8');
const lines = content.split(/\r?\n/);
lines.forEach((l, i) => {
  if (l.startsWith('function ') || l.includes('Figure(')) {
    console.log(`L${i+1}: ${l}`);
  }
});
