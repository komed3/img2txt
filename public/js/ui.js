import { $, $$ } from './utils.js';

export class UIManager {

    constructor () {
        this.loaderTimeout = null;
    }

    showLoader ( textMsg = null, delay = 0 ) {
        if ( textMsg ) $( 'loaderText' ).textContent = textMsg;
        clearTimeout( this.loaderTimeout );

        if ( delay > 0 ) this.loaderTimeout = setTimeout( () => $( 'loaderOverlay' ).classList.remove( 'hidden' ), delay );
        else $( 'loaderOverlay' ).classList.remove( 'hidden' );
    }

    hideLoader () {
        clearTimeout( this.loaderTimeout );
        $( 'loaderOverlay' ).classList.add( 'hidden' );
    }

    showToast ( msg ) {
        $( 'toast' ).textContent = msg;
        $( 'toast' ).classList.remove( 'hidden' );
        setTimeout( () => $( 'toast' ).classList.add( 'hidden' ), 3000 );
    }

    calcStats( text, timeMs ) {
        const timeS = ( timeMs / 1000 ).toFixed( 1 );
        const wordCount = text.split( /\s+/ ).filter( w => w.length > 0 ).length;
        const paraCount = text.split( /\n\n+/ ).filter( p => p.trim().length > 0 ).length;

        $( 'statTime' ).textContent = timeS + 's';
        $( 'statWords' ).textContent = wordCount;
        $( 'statParagraphs' ).textContent = paraCount;
    }

    showStep ( stepNum, onStep2Init = null ) {
        $$( '.step' ).forEach( ( el, idx ) => {
            if ( idx + 1 === stepNum ) el.classList.add( 'active-step' );
            else el.classList.remove( 'active-step' );
        } );

        if ( stepNum === 2 && onStep2Init ) setTimeout( onStep2Init, 50 );
    }

}

export const ui = new UIManager ();
