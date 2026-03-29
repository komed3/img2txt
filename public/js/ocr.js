class TextFormatter {

    process ( text ) {
        if ( ! text ) return '';

        // Step 1: Trim text
        text = text.trim();

        // Step 2: Normalize CRLF to LF
        text = text.replace( /\r\n/g, '\n' );

        // Step 3: Remove hypens
        text = text.replace( /(\p{Ll}+)-\r?\n+(\p{Ll}+)/ug, '$1$2' );

        // Step 4: Mark list items
        text = text.replace( /(^|\n)([ \t]*)([-+*=])\s+/g, '$1<<<LIST>>>$2- ' );

        // Step 5: Mark likely paragraph breaks with a placeholder
        text = text.replace( /([.!?])\n+(\p{Lu})/ug, '$1<<<PARA>>>$2' );

        // Step 6: Replace all remaining newlines with a space (except lists)
        text = text.replace( /\n+(?!<<<LIST>>>)/g, ' ' );

        // Step 7: Restore paragraph breaks (double newline for readability)
        text = text.replace( /<<<PARA>>>/g, '\n\n' );

        // Step 8: Clean up extra spaces
        text = text.replace( /[ \t]+/g, ' ' );

        // Step 9: Restore list items
        text = text.replace( /<<<LIST>>>/g, '\n' );

        return text.trim();
    }

}

export class OCREngine {

    constructor () {
        this.formatter = new TextFormatter ();
        this.worker = null;
    }

    async process ( blobs, lang ) {
        // Create new worker if none exists
        if ( ! this.worker ) this.worker = await Tesseract.createWorker( lang, 1, {
            workerPath: 'vendor/tesseract/worker.min.js',
            corePath: 'vendor/tesseract/tesseract-core.wasm.js',
            langPath: 'vendor/tesseract/lang-data'
        } );
        // Reinitialize if language has changed
        else await this.worker.reinitialize( lang );

        await this.worker.setParameters( { tessedit_pageseg_mode: 3 } );

        let combinedText = '';
        for ( let i = 0; i < blobs.length; i++ ) {
            const { data: { text } } = await this.worker.recognize( blobs[ i ] );
            combinedText += text + '\n\n';
        }

        return this.formatter.process( combinedText );
    }

}

export const ocrEngine = new OCREngine ();
