let currentLang = localStorage.getItem( 'img2txt-lang' ) || 'en';

export let dict = {};

export async function setLanguage ( lang ) {
    if ( ! dict[ lang ] ) try {
        const res = await fetch( `locales/${lang}.json` );
        if ( res.ok ) dict[ lang ] = await res.json();
        else {
            console.error( `Missing translation file: ${lang}.json` );
            return;
        }
    } catch ( err ) {
        console.error( err );
        return;
    }

    currentLang = lang;
    localStorage.setItem( 'img2txt-lang', lang );

    document.title = dict[ lang ].title || 'img2txt';

    document.querySelectorAll( '[data-i18n]' ).forEach( el => {
        const key = el.getAttribute( 'data-i18n' );
        if ( dict[ lang ][ key ] ) el.textContent = dict[ lang ][ key ];
    } );

    document.querySelectorAll( '[data-i18n-placeholder]' ).forEach( el => {
        const key = el.getAttribute( 'data-i18n-placeholder' );
        if ( dict[ lang ][ key ] ) el.placeholder = dict[ lang ][ key ];
    } );

    document.getElementById( 'langDe' ).classList.toggle( 'active', lang === 'de' );
    document.getElementById( 'langEn' ).classList.toggle( 'active', lang === 'en' );
}

export function t ( key ) {
    if( ! dict[ currentLang ] ) return key;
    return dict[ currentLang ][ key ] || key;
}

export async function initI18n () {
    document.getElementById( 'langDe' ).addEventListener( 'click', () => setLanguage( 'de' ) );
    document.getElementById( 'langEn' ).addEventListener( 'click', () => setLanguage( 'en' ) );
    await setLanguage( currentLang );
}
