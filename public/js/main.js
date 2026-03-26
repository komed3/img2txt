import { docCtx, setupCanvas, clearRegions, resetZoom, cropRegionToBlob, getRegions, getDocumentBlob } from './canvas.js';
import { initI18n, t } from './i18n.js';
import { processOcr } from './ocr.js';
import { loadPdf } from './pdf.js';
import { showLoader, hideLoader, showStep, showToast, calcStats } from './utils.js';

await initI18n();

const fileInput = document.getElementById( 'fileInput' );
const uploadZone = document.getElementById( 'uploadZone' );
const languageSelect = document.getElementById( 'languageSelect' );
const clearRegionsBtn = document.getElementById( 'clearRegionsBtn' );
const extractBtn = document.getElementById( 'extractBtn' );
const cancelBtn = document.getElementById( 'cancelBtn' );
const restartBtn = document.getElementById( 'restartBtn' );
const resultText = document.getElementById( 'resultText' );
const copyBtn = document.getElementById( 'copyBtn' );
const pdfControls = document.getElementById( 'pdfControls' );

languageSelect.value = localStorage.getItem( 'img2txt-ocr-lang' ) || 'eng';
languageSelect.addEventListener( 'change', ( e ) => localStorage.setItem( 'img2txt-ocr-lang', e.target.value ) );

uploadZone.addEventListener( 'dragover', ( e ) => { e.preventDefault(), uploadZone.classList.add( 'dragover' ) } );
uploadZone.addEventListener( 'dragleave', () => uploadZone.classList.remove( 'dragover' ) );
uploadZone.addEventListener( 'drop', ( e ) => {
    e.preventDefault(), uploadZone.classList.remove( 'dragover' );

    if ( e.dataTransfer.files && e.dataTransfer.files[ 0 ] ) {
        fileInput.files = e.dataTransfer.files;
        handleFileSelect( { target: fileInput } );
    }
} );

uploadZone.addEventListener( 'click', ( e ) => { if( e.target !== fileInput ) fileInput.click() } );
fileInput.addEventListener( 'change', handleFileSelect );

clearRegionsBtn.addEventListener( 'click', clearRegions );
cancelBtn.addEventListener( 'click', resetApp );
restartBtn.addEventListener( 'click', resetApp );

copyBtn.addEventListener( 'click', () => {
    if ( ! resultText.value ) return;
    navigator.clipboard.writeText( resultText.value ).then( () => showToast( t( 'copy_done' ) ) );
} );

extractBtn.addEventListener( 'click', async () => {
    showLoader( t( 'processing' ) );
    const startTime = performance.now();

    try {
        const lang = languageSelect.value;
        const regions = getRegions();
        const blobs = [];

        if ( regions.length === 0 ) blobs.push( await getDocumentBlob() );
        else for ( const r of regions ) blobs.push( await cropRegionToBlob( r ) );

        const text = await processOcr( blobs, lang );
        const duration = performance.now() - startTime;

        resultText.value = text;
        calcStats( text, duration );
        showStep( 3 );
    } catch ( err ) {
        console.error( err );
        alert( t( 'err_fatal' ) + err.message );
    } finally {
        hideLoader();
    }
} );
