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

}

// Global start
window.addEventListener( 'scroll', ( e ) => e.preventDefault(), { passive: false } );
new ImageTextApp ();
