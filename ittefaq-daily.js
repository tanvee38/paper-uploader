/**
 * ittefaq-daily.js
 * Download today's Ittefaq 1st-edition e-paper,
 * generate 11x17 PDFs, merge all pages,
 * and upload to Google Drive using OAuth.
 */

const fs = require('fs');
const { chromium } = require('playwright');
const { PDFDocument } = require('pdf-lib');
const authorize = require('./drive-auth');
const { google } = require('googleapis');

// Cleanup temporary page PDFs
function cleanupTempFiles(totalPages) {
  for (let i = 1; i <= totalPages; i++) {
    const file = `page-${i}.pdf`;
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  console.log('🌐 Going to Ittefaq homepage...');
  await page.goto('https://epaper.ittefaq.com.bd/', { waitUntil: 'domcontentloaded' });

  // Select 1st-edition option
  const editionOption = await page.$('option[data-alias="1st-edition"]');
  if (!editionOption) {
    console.error('❌ Could not find 1st-edition option');
    await browser.close();
    return;
  }

  const value = await editionOption.getAttribute('value');      // e.g., "2512"
  const alias = await editionOption.getAttribute('data-alias'); // "1st-edition"
  const BASE_URL = `https://epaper.ittefaq.com.bd/edition/${value}/${alias}/page`;
  console.log('✅ Downloading from:', BASE_URL);

  // Number of pages (adjust if some editions have more pages)
  const TOTAL_PAGES = 16;

  // Download pages as 11x17 PDFs
  for (let i = 1; i <= TOTAL_PAGES; i++) {
    console.log(`Downloading page ${i}...`);
    await page.goto(`${BASE_URL}/${i}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // ensure page fully loaded

    // Optional: hide left pages
    await page.addStyleTag({
  content: `
    .page-left { display: none !important; }
    .spread-left { display: none !important; }
    body { transform: scale(0.95); transform-origin: top left; }
  `
});

const tempPath = `page-${i}.pdf.tmp`;
await page.pdf({
  path: tempPath,
  width: 792,
  height: 1224,
  printBackground: true,
  scale: 1, // combined with CSS scaling
  pageRanges: '1'
});
fs.renameSync(tempPath, `page-${i}.pdf`);

  }

  await browser.close();

  console.log('📄 Merging pages...');
  const mergedPdf = await PDFDocument.create();
  for (let i = 1; i <= TOTAL_PAGES; i++) {
    const pdfBytes = fs.readFileSync(`page-${i}.pdf`);
    const pdf = await PDFDocument.load(pdfBytes);
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    pages.forEach(p => mergedPdf.addPage(p));
  }

  const mergedFileName = 'ittefaq-merged.pdf';
  fs.writeFileSync(mergedFileName, await mergedPdf.save());
  console.log('✅ PDF ready:', mergedFileName);

  // Upload to Google Drive
  const auth = await authorize();
  const drive = google.drive({ version: 'v3', auth });

  console.log('☁️ Uploading to Google Drive...');
  await drive.files.create({
    requestBody: {
      name: 'ittefaq-final.pdf',
      parents: ['1UYyXqgNYd3oCbKfUumrPE6l0qIzK11a8'] // replace with your folder ID
    },
    media: {
      mimeType: 'application/pdf',
      body: fs.createReadStream(mergedFileName)
    }
  });

  console.log('✅ Uploaded to Google Drive');

  cleanupTempFiles(TOTAL_PAGES);
  console.log('🧹 Temporary files removed. Done!');
})();
