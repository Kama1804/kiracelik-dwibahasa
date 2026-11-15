const fs = require('fs');
const content = fs.readFileSync('src/engine/questionGenerator.js', 'utf8');
const lines = content.split(/\r?\n/);
for (let i = 1817; i < 2092; i++) {
  if (lines[i].includes('function ') || lines[i].includes('subSkillId:')) {
    console.log(`L${i+1}: ${lines[i]}`);
  }
}
