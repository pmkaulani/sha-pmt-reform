// Read all docx files in docs/ and output their text content for review
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '..', 'docs');
const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.docx'));

(async () => {
  for (const file of files) {
    const fullPath = path.join(docsDir, file);
    try {
      const result = await mammoth.extractRawText({ path: fullPath });
      const text = result.value.substring(0, 600); // first 600 chars
      console.log(`\n=== ${file} ===`);
      console.log(text);
      console.log('--- END PREVIEW ---');
    } catch (e) {
      console.error(`Error reading ${file}: ${e.message}`);
    }
  }
})();
