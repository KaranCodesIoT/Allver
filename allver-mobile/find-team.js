const fs = require('fs');
const content = fs.readFileSync('./app/project-progress.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('teamSection') || line.includes('teamMemberRole')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
