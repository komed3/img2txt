let worker = null;

function postProcessText ( text ) {
    if ( ! text ) return '';

    // Handle hyphenation
    let processed = text.replace( /([a-zA-ZäöüßÄÖÜ])-\n([a-zA-ZäöüßÄÖÜ])/g, '$1$2' );

    // Normalize newlines
    processed = processed.replace( /\r\n/g, '\n' );

    // Filter sentences wrap
    const paragraphs = processed.split( /\n{2,}/ );
    const cleanedParagraphs = paragraphs.map( p => p.replace( /\n/g, ' ' ) );

    // Remove empty paragraphs
    processed = cleanedParagraphs.join( '\n\n' );

    // Correct punctuation anomalies
    processed = processed.replace( / +([.,;:!?])/g, '$1' );

    // Clean multiple spaces
    processed = processed.replace( / {2,}/g, ' ' );

    return processed.trim();
}

export async function processOcr ( blobs, lang ) {
    if ( ! worker ) worker = await Tesseract.createWorker( lang, 1, {
        workerPath: 'vendor/tesseract/worker.min.js',
        corePath: 'vendor/tesseract/tesseract-core.wasm.js',
        langPath: 'vendor/tesseract/lang-data'
    } );
    else await worker.reinitialize( lang );

    await worker.setParameters( { tessedit_pageseg_mode: 3 } );

    let combinedText = '';
    for ( let i = 0; i < blobs.length; i++ ) {
        const { data: { text } } = await worker.recognize( blobs[ i ] );
        combinedText += text + '\n\n';
    }

    return postProcessText( combinedText );
}
