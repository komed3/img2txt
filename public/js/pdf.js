import { t } from './i18n.js';
import { ui } from './ui.js';
import { $ } from './utils.js';

export class PdfRenderer {

    constructor ( workspace ) {
        this.workspace = workspace;
        this.pdfDoc = null;
        this.pageNum = 1;
        this.isRendering = false;

        this.setupEvents();
    }

    setupEvents () {
        const prevBtn = $( 'prevPageBtn' );
        const nextBtn = $( 'nextPageBtn' );
        if ( prevBtn ) prevBtn.onclick = () => this.changePage( -1 );
        if ( nextBtn ) nextBtn.onclick = () => this.changePage( 1 );
    }

    async load ( pdfData ) {
        this.pdfDoc = await pdfjsLib.getDocument( { data: pdfData } ).promise;
        this.pageNum = 1;

        $( 'pageCount' ).textContent = this.pdfDoc.numPages;
        $( 'pdfControls' ).classList.remove( 'hidden' );

        await this.renderPage( this.pageNum );
    }

    async renderPage ( num ) {
        if ( this.isRendering ) return;
        this.isRendering = true;

        ui.showLoader( t( 'status_render' ) + num );

        const page = await this.pdfDoc.getPage( num );
        const viewport = page.getViewport( { scale: 2.0 } );

        // We use the canvas from the workspace
        const canvas = $( 'documentCanvas' );
        const context = canvas.getContext( '2d' );

        this.workspace.setupCanvas( viewport.width, viewport.height );
        await page.render( { canvasContext: context, viewport: viewport } ).promise;

        this.pageNum = num;
        $( 'pageNum' ).textContent = num;

        this.isRendering = false;
        ui.hideLoader();
    }

    async changePage ( delta ) {
        const next = this.pageNum + delta;
        if ( next < 1 || next > ( this.pdfDoc?.numPages || 1 ) ) return;

        this.workspace.clearRegions();
        await this.renderPage( next );
        this.workspace.resetZoom();
    }

}
