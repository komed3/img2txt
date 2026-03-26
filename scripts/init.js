const { mkdirSync } = require( 'node:fs' );
const { get } = require( 'node:https' );
const { join } = require( 'node:path' );

const VENDOR_DIR = join( __dirname, '../public/vendor' );
const TESSERACT_DIR = join( VENDOR_DIR, 'tesseract' );
const LANG_DIR = join( TESSERACT_DIR, 'lang-data' );
const PDFJS_DIR = join( VENDOR_DIR, 'pdfjs' );

const urls = [
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', dest: join( PDFJS_DIR, 'pdf.min.js' ) },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js', dest: join( PDFJS_DIR, 'pdf.worker.min.js' ) },
    { url: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', dest: join( TESSERACT_DIR, 'tesseract.min.js' ) },
    { url: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js', dest: join( TESSERACT_DIR, 'worker.min.js' ) },
    { url: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js', dest: join( TESSERACT_DIR, 'tesseract-core.wasm.js' ) }
];

for ( const lang of [ 'eng', 'deu', 'fra', 'spa', 'ita', 'nld', 'pol', 'por' ] ) urls.push( {
    url: `https://tessdata.projectnaptha.com/4.0.0/${lang}.traineddata.gz`,
    dest: join( LANG_DIR, `${lang}.traineddata.gz` )
} );
