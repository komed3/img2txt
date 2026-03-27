class TextRefiner {

    constructor () {
        this.listMarkers = [ /^[\-\*\•]\s/, /^(\d+[\.\)])\s/, /^([a-zA-Z][\.\)])\s/ ];
    }

    process ( text ) {
        if ( ! text ) return '';

        // 1. Initial Structural Cleanup
        let p = text.replace( /\r\n/g, '\n' ).replace( /(\p{L})-\n\s*(\p{L})/gu, '$1$2' );

        // 2. Multistrategy Hypothesis Generation
        const hypotheses = [
            this.hypoConservative( p ),
            this.hypoSemiAggressive( p ),
            this.hypoExtreme( p )
        ];

        // 3. The Judge: Calculate Penalties for all versions
        let winner = hypotheses[ 0 ];
        let minScore = this.calculatePenalty( winner );

        for ( let i = 1; i < hypotheses.length; i++ ) {
            const score = this.calculatePenalty( hypotheses[ i ] );

            if ( score < minScore ) {
                minScore = score;
                winner = hypotheses[ i ];
            }
        }

        // 4. Final Polish of the winning text
        return this.finalPolish( winner );
    }

    // --- Hypothesis Strategies (Strictly structural, no language lists) ---

    // Very careful: only joins across single newlines if line ends with comma or hyphen
    hypoConservative ( text ) {
        return text.split( '\n' ).map( l => l.trim() ).reduce( ( acc, line, i, arr ) => {
            if ( i === 0 ) return line;

            const prev = arr[ i - 1 ];
            if ( prev.endsWith( ',' ) || prev.endsWith( '-' ) ) return acc + ' ' + line;
            return acc + '\n' + line;
        }, '' );
    }

    // Joins across single newlines if previous doesn't end with terminal AND next isn't a list
    hypoSemiAggressive ( text ) {
        const lines = text.split( '\n' ).map( l => l.trim() );
        let result = '';

        for ( let i = 0; i < lines.length; i++ ) {
            const line = lines[ i ];
            if ( i === 0 ) { result = line; continue }
            if ( line === '' ) { result += '\n'; continue }

            const prev = lines[ i - 1 ];
            let shouldJoin = false;

            if ( prev && ! /[.!?:]/.test( prev.slice( -1 ) ) && ! this.listMarkers.some( m => m.test( line ) ) ) shouldJoin = true;
            if ( /^\p{Ll}/u.test( line ) ) shouldJoin = true;

            result += ( shouldJoin ? ' ' : '\n' ) + line;
        }

        return result;
    }

    // Bridges even double newlines if semantic link is high
    hypoExtreme ( text ) {
        const lines = text.split( '\n' ).map( l => l.trim() ).filter( l => l.length > 0 );
        let result = [];
        let buffer = '';

        for ( let i = 0; i < lines.length; i++ ) {
            const line = lines[ i ];
            if ( ! buffer ) { buffer = line; continue }

            const prev = lines[ i - 1 ];
            let mustBreak = false;

            // Hard break: Terminal + Uppercase (with no digit-start fallback)
            if ( /[.!?]/.test( prev.slice( -1 ) ) && /^\p{Lu}/u.test( line ) && ! /^\d/.test( line ) ) mustBreak = true;
            if ( this.listMarkers.some( m => m.test( line ) ) ) mustBreak = true;

            if ( mustBreak ) { result.push( buffer ), buffer = line }
            else buffer += ' ' + line;
        }

        if ( buffer ) result.push( buffer );
        return result.join( '\n\n' );
    }

    // --- Structural Penalty Scoring (Universal) ---

    calculatePenalty ( text ) {
        let penalty = 0;
        const lines = text.split( '\n' ).map( l => l.trim() ).filter( l => l.length > 0 );

        // 1. Broken Numerical Entities (Critical for decimals)
        const decimalMatches = text.match( /(\d+[,.])\n+(\d+)/g );
        if ( decimalMatches ) penalty += decimalMatches.length * 1000;

        // 2. Semantic continuity (Casing)
        for ( let i = 1; i < lines.length; i++ ) {
            const line = lines[ i ];
            const prev = lines[ i - 1 ];

            // Lowercase start after a newline is usually a 'broken sentence' penalty
            if ( /^\p{Ll}/u.test( line ) ) {
                if ( prev && /[.!?]/.test( prev.slice( -1 ) ) ) penalty += 500; // Period followed by lowercase
                else penalty += 200; // Midd-sentence break
            }
        }

        // 3. Unit protection (Suffixes on newline)
        // Matches common SI units and symbols appearing at the start of a line
        const unitMatches = text.match( /\n+(km|m|kg|s|h|€|%|km²|m³|ft|lb|oz)\b/ig );
        if ( unitMatches ) penalty += unitMatches.length * 800;

        // 4. Broken word parts (No hyphen bridge)
        // We only penalize if it's not a common list or uppercase start
        const wordMatches = text.match( /[\p{L}]\n+[\p{L}]/gu );
        if ( wordMatches ) penalty += wordMatches.length * 50;

        return penalty;
    }

    finalPolish ( text ) {
        let res = text;
        res = res.replace( / +([.,;:!?])/g, '$1' );
        res = res.replace( /(\d+)\s*([.,])\s*(\d+)/g, '$1$2$3' );
        res = res.replace( / {2,}/g, ' ' );

        // Final normalization of paragraph breaks
        res = res.replace( /\n{3,}/g, '\n\n' );
        return res.trim();
    }

}

export class OCREngine {

    constructor () {
        this.refiner = new TextRefiner ();
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

        return this.refiner.process( combinedText );
    }

}

export const ocrEngine = new OCREngine ();
