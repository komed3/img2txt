let curLang = localStorage.getItem( 'img2txt-lang' ) || 'en';

export const DICT = {};

export async function setLanguage ( lang ) {
    if ( ! DICT[ lang ] ) try {
        const res = await fetch( `locales/${lang}.json` );
        if ( res.ok ) DICT[ lang ] = await res.json();
        else {
            console.error( `Missing translation file: ${lang}.json` );
            return;
        }
    } catch ( err ) {
        console.error( err );
        return;
    }

    curLang = lang;
    localStorage.setItem( 'img2txt-lang', lang );

    document.title = t( 'title', lang, 'img2txt' );

    document.querySelectorAll( '[data-i18n]' ).forEach( el => {
        const key = el.getAttribute( 'data-i18n' );
        if ( DICT[ lang ][ key ] ) el.textContent = t( key, lang );
    } );

    document.querySelectorAll( '[data-i18n-placeholder]' ).forEach( el => {
        const key = el.getAttribute( 'data-i18n-placeholder' );
        if ( DICT[ lang ][ key ] ) el.placeholder = t( key, lang );
    } );

    document.getElementById( 'langDe' ).classList.toggle( 'active', lang === 'de' );
    document.getElementById( 'langEn' ).classList.toggle( 'active', lang === 'en' );
}

export function t ( key, lang = undefined, fb = undefined ) {
    if( ! DICT[ lang ?? curLang ] ) return fb ?? key;
    return DICT[ lang ?? curLang ][ key ] || ( fb ?? key );
}

export async function initI18n () {
    document.getElementById( 'langDe' ).addEventListener( 'click', () => setLanguage( 'de' ) );
    document.getElementById( 'langEn' ).addEventListener( 'click', () => setLanguage( 'en' ) );

    await setLanguage( curLang );
}
