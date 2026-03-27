import { CanvasWorkspace } from './canvas.js';
import { i18n, t } from './i18n.js';
import { ocrEngine } from './ocr.js';
import { PdfRenderer } from './pdf.js';
import { ThemeManager } from './theme.js';
import { ui } from './ui.js';
import { $ } from './utils.js';

class ImageTextApp {

    constructor () {
        this.theme = new ThemeManager ();
        this.workspace = new CanvasWorkspace ();
        this.pdf = new PdfRenderer ( this.workspace );

        this.init();
    }

    async init () {
        await i18n.init();
        this.setupEvents();

        // Persistence
        $( 'languageSelect' ).value = localStorage.getItem( 'img2txt-ocr-lang' ) || 'eng';
        $( 'languageSelect' ).onchange = ( e ) => localStorage.setItem( 'img2txt-ocr-lang', e.target.value );
    }

    setupEvents () {
        // Upload
        const uploadZone = $( 'uploadZone' );
        const fileInput = $( 'fileInput' );

        uploadZone.ondragover = ( e ) => { e.preventDefault(), uploadZone.classList.add( 'dragover' ) };
        uploadZone.ondragleave = () => uploadZone.classList.remove( 'dragover' );
        uploadZone.onclick = ( e ) => { if ( e.target !== fileInput ) fileInput.click() };
        fileInput.onchange = ( e ) => this.handleFileSelect( e.target.files[ 0 ] );

        uploadZone.ondrop = ( e ) => {
            e.preventDefault();

            uploadZone.classList.remove( 'dragover' );

            if ( e.dataTransfer.files?.[ 0 ] ) {
                fileInput.files = e.dataTransfer.files;
                this.handleFileSelect( fileInput.files[ 0 ] );
            }
        };

        // Actions
        $( 'clearRegionsBtn' ).onclick = () => this.workspace.clearRegions();
        $( 'cancelBtn' ).onclick = () => this.resetApp();
        $( 'restartBtn' ).onclick = () => this.resetApp();
        $( 'extractBtn' ).onclick = () => this.performExtraction();

        $( 'copyBtn' ).onclick = () => {
            const text = $( 'resultText' ).value;
            if ( ! text ) return;

            navigator.clipboard.writeText( text ).then(
                () => ui.showToast( t( 'copy_done' ) )
            );
        };
    }

    resetApp () {
        $( 'fileInput' ).value = '';
        $( 'resultText' ).value = '';
        $( 'pdfControls' ).classList.add( 'hidden' );

        const ctx = this.workspace.getDocContext();
        ctx.clearRect( 0, 0, this.workspace.docCanvas.width, this.workspace.docCanvas.height );
        this.workspace.clearRegions();
        this.workspace.resetZoom();

        ui.showStep( 1 );
    }

    async handleFileSelect ( file ) {
        if ( ! file ) return;

        this.workspace.clearRegions();
        this.workspace.resetZoom();

        if ( file.type === 'application/pdf' ) {
            ui.showLoader( t( 'status_load_pdf' ), 250 );

            const reader = new FileReader ();
            reader.onload = async ( e ) => {
                await this.pdf.load( e.target.result );
                ui.showStep( 2, () => this.workspace.resetZoom() );
            };

            reader.readAsArrayBuffer( file );
        } else if ( file.type.startsWith( 'image/' ) ) {
            ui.showLoader( t( 'status_load_img' ), 250 );
            $( 'pdfControls' ).classList.add( 'hidden' );

            const img = new Image ();
            img.onload = () => {
                this.workspace.setupCanvas( img.width, img.height );
                this.workspace.getDocContext().drawImage(
                    img, 0, 0, img.width, img.height,
                    0, 0, this.workspace.docCanvas.width, this.workspace.docCanvas.height
                );

                ui.hideLoader();
                ui.showStep( 2, () => this.workspace.resetZoom() );
            };

            img.src = URL.createObjectURL( file );
        }
    }

    async performExtraction () {
        ui.showLoader( t( 'processing' ) );
        const startTime = performance.now();

        try {
            const lang = $( 'languageSelect' ).value;
            const regions = this.workspace.getRegions();
            const blobs = [];

            if ( regions.length === 0 ) blobs.push( await this.workspace.getDocumentBlob() );
            else for ( const r of regions ) blobs.push( await this.workspace.cropRegionToBlob( r ) );

            const text = await ocrEngine.process( blobs, lang );
            const duration = performance.now() - startTime;

            $( 'resultText' ).value = text;
            ui.calcStats( text, duration );
            ui.showStep( 3 );
        } catch ( err ) {
            console.error( err );
            alert( t( 'err_fatal' ) + err.message );
        } finally {
            ui.hideLoader();
        }
    }

}

// Global start
window.addEventListener( 'scroll', ( e ) => e.preventDefault(), { passive: false } );
new ImageTextApp ();
