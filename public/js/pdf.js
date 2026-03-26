import { setupCanvas, clearRegions, resetZoom, docCtx } from './canvas.js';
import { t } from './i18n.js';
import { showLoader, hideLoader } from './utils.js';

let currentPdf = null;
let currentPageNumber = 1;

const pageNumSpan = document.getElementById( 'pageNum' );
const pageCountSpan = document.getElementById( 'pageCount' );
const pdfControls = document.getElementById( 'pdfControls' );

export async function loadPdf ( fileBuffer ) {
    const typedarray = new Uint8Array ( fileBuffer );
    currentPdf = await pdfjsLib.getDocument( typedarray ).promise;
    pageCountSpan.textContent = currentPdf.numPages;
    pdfControls.classList.remove('hidden');

    await renderPdfPage( 1 );
}

export async function renderPdfPage ( num ) {
    if ( ! currentPdf || num < 1 || num > currentPdf.numPages ) return;
    showLoader( t( 'status_render' ) + num + '…', 150 );

    return new Promise ( ( resolve ) => setTimeout( async () => {
        const page = await currentPdf.getPage( num );
        const viewport = page.getViewport( { scale: 2.0 } );

        currentPageNumber = num;
        pageNumSpan.textContent = num;

        setupCanvas( viewport.width, viewport.height );
        await page.render( { canvasContext: docCtx, viewport } ).promise;

        resetZoom();
        clearRegions();
        hideLoader();
        resolve();
    }, 50 ) );
}

document.getElementById( 'prevPageBtn' ).addEventListener( 'click', () => renderPdfPage( currentPageNumber - 1 ) );
document.getElementById( 'nextPageBtn' ).addEventListener( 'click', () => renderPdfPage( currentPageNumber + 1 ) );
