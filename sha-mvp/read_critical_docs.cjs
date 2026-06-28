// Read full text of key docs that need updating
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '..', 'docs');
const criticalDocs = [
  'Algorithm_Documentation.docx',
  'ASSUMPTIONS.docx',
  'EXECUTIVE_SUMMARY_ONE_PAGER.docx',
  'SHAP_DEDUCTION_RECEIPTS.docx',
  'PROJECT_COMPLETION_SUMMARY.docx',
];

(async () => {
  for (const file of criticalDocs) {
    const fullPath = path.join(docsDir, file);
    try {
      const result = await mammoth.extractRawText({ path: fullPath });
      console.log(`\n========== ${file} ==========`);
      console.log(result.value.substring(0, 3000));
      console.log('\n--- TRUNCATED ---\n');
    } catch (e) {
      console.error(`Error reading ${file}: ${e.message}`);
    }
  }
})();
