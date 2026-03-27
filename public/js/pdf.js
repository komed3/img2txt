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
        const prevBtnCanvas = $( 'prevPageBtnCanvas' );
        const nextBtnCanvas = $( 'nextPageBtnCanvas' );

        const prevAction = () => this.changePage( -1 );
        const nextAction = () => this.changePage( 1 );

        if ( prevBtn ) prevBtn.onclick = prevAction;
        if ( nextBtn ) nextBtn.onclick = nextAction;
        if ( prevBtnCanvas ) prevBtnCanvas.onclick = prevAction;
        if ( nextBtnCanvas ) nextBtnCanvas.onclick = nextAction;
    }

    async load ( pdfData ) {
        this.pdfDoc = await pdfjsLib.getDocument( { data: pdfData } ).promise;
        this.pageNum = 1;

        await this.renderPage( this.pageNum );
    }

    async renderPage ( num ) {
        if ( this.isRendering ) return;
        this.isRendering = true;

        ui.showLoader( t( 'status_render' ) + num, 250 );

        const page = await this.pdfDoc.getPage( num );
        const viewport = page.getViewport( { scale: 2.0 } );

        // Offscreen canvas for rotation source tracking
        const offCanvas = document.createElement( 'canvas' );
        offCanvas.width = viewport.width;
        offCanvas.height = viewport.height;
        const offCtx = offCanvas.getContext( '2d' );

        await page.render( { canvasContext: offCtx, viewport: viewport } ).promise;

        this.workspace.setupCanvas( viewport.width, viewport.height, offCanvas );

        this.pageNum = num;
        const lbl1 = $( 'pageNum' );
        const lbl2 = $( 'pageNumCanvas' );
        const cnt1 = $( 'pageCount' );
        const cnt2 = $( 'pageCountCanvas' );

        if ( lbl1 ) lbl1.textContent = num;
        if ( lbl2 ) lbl2.textContent = num;
        if ( cnt1 ) cnt1.textContent = this.pdfDoc.numPages;
        if ( cnt2 ) cnt2.textContent = this.pdfDoc.numPages;

        const nav1 = $( 'pdfNavCanvas' );
        const nav2 = $( 'pdfControls' );
        if ( nav1 ) nav1.classList.toggle( 'hidden', this.pdfDoc.numPages <= 1 );
        if ( nav2 ) nav2.classList.toggle( 'hidden', this.pdfDoc.numPages <= 1 );

        const isAtStart = ( num === 1 );
        const isAtEnd = ( num === this.pdfDoc.numPages );

        [ $( 'prevPageBtn' ), $( 'prevPageBtnCanvas' ) ].forEach( b => { if ( b ) b.disabled = isAtStart } );
        [ $( 'nextPageBtn' ), $( 'nextPageBtnCanvas' ) ].forEach( b => { if ( b ) b.disabled = isAtEnd } );

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
