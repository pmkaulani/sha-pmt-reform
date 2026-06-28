const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\STD USER\\Desktop\\work\\SHA';
const files = [
  'SHA_Reform_Master_Brief.docx',
  'SHA_PMT_Full_Technical_Audit.docx',
  'SHA_PMT_v2.1_Executive_Briefing.docx'
];

(async () => {
  for (const file of files) {
    const fullPath = path.join(dir, file);
    try {
      if (fs.existsSync(fullPath)) {
        const result = await mammoth.extractRawText({ path: fullPath });
        console.log(`\n========== ${file} ==========`);
        // Just print the first 2000 characters to get the gist
        console.log(result.value.substring(0, 2000));
        console.log('\n--- TRUNCATED ---\n');
      } else {
        console.log(`\n========== ${file} NOT FOUND ==========`);
      }
    } catch (e) {
      console.error(`Error reading ${file}: ${e.message}`);
    }
  }
})();
