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

}

// Global start
window.addEventListener( 'scroll', ( e ) => e.preventDefault(), { passive: false } );
new ImageTextApp ();
