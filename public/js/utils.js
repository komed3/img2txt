export const $ = ( id ) => document.getElementById( id );
export const $$ = ( sel ) => document.querySelectorAll( sel );

const loaderOverlay = document.getElementById( 'loaderOverlay' );
const loaderText = document.getElementById( 'loaderText' );
const toast = document.getElementById( 'toast' );
const statWords = document.getElementById( 'statWords' );
const statParagraphs = document.getElementById( 'statParagraphs' );
const statTime = document.getElementById( 'statTime' );

let loaderTimeout = null;

export function showLoader ( textMsg = null, delay = 0 ) {
    if( textMsg ) loaderText.textContent = textMsg;
    clearTimeout( loaderTimeout );

    if ( delay > 0 ) loaderTimeout = setTimeout( () => loaderOverlay.classList.remove( 'hidden' ), delay );
    else loaderOverlay.classList.remove( 'hidden' ); 
}

export function hideLoader () {
    clearTimeout( loaderTimeout );
    loaderOverlay.classList.add( 'hidden' );
}

export function showToast ( msg ) {
    toast.textContent = msg;
    toast.classList.remove( 'hidden' );

    setTimeout( () => toast.classList.add( 'hidden' ), 3000 );
}

export function calcStats ( text, timeMs ) {
    const timeS = ( timeMs / 1000 ).toFixed( 1 );
    const wordCount = text.split( /\s+/ ).filter( w => w.length > 0 ).length;
    const paraCount = text.split( /\n\n+/ ).filter( p => p.trim().length > 0 ).length;

    statTime.textContent = timeS + 's';
    statWords.textContent = wordCount;
    statParagraphs.textContent = paraCount;
}

export function showStep ( stepNum, onStep2Init = null ) {
    document.querySelectorAll( '.step' ).forEach( ( el, idx ) => {
        if ( idx + 1 === stepNum ) el.classList.add( 'active-step' );
        else el.classList.remove( 'active-step' );
    } );

    if ( stepNum === 2 && onStep2Init ) setTimeout( onStep2Init, 50 ); 
}
