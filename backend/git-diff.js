const { exec } = require('child_process');
const fs = require('fs');
const path = require('fs');

exec('git diff', { cwd: 'c:\\Users\\karan chaubey\\OneDrive\\Desktop\\Allver' }, (err, stdout, stderr) => {
  fs.writeFileSync('c:\\Users\\karan chaubey\\OneDrive\\Desktop\\Allver\\backend\\git_diff.txt', stdout || stderr || (err ? err.message : 'No diff'));
});
