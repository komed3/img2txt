import { $, $$ } from './utils.js';

export class I18nManager {

    constructor () {
        this.lang = localStorage.getItem( 'img2txt-lang' ) || 'en';
        this.translations = {};
    }

    async init () {
        await this.loadTranslations( this.lang );
        this.updateUI();
        this.setupButtons();
    }

    async loadTranslations ( lang ) {
        try {
            const response = await fetch( `./locales/${lang}.json` );
            this.translations = await response.json();
            this.lang = lang;

            localStorage.setItem('img2txt-lang', lang);
            document.documentElement.lang = lang;
        } catch ( err ) {
            console.error( 'Failed to load translations:', err );
        }
    }

    t ( key ) {
        return this.translations[ key ] || key;
    }

    updateUI () {
        $$( '[data-i18n]' ).forEach( el => {
            const key = el.getAttribute( 'data-i18n' );
            if ( this.translations[ key ] ) el.innerText = this.translations[ key ];
        } );

        $$( '[data-i18n-placeholder]' ).forEach( el => {
            const key = el.getAttribute( 'data-i18n-placeholder' );
            if ( this.translations[ key ] ) el.placeholder = this.translations[ key ];
        } );

        // Update active buttons
        const btnEn = $( 'langEn' );
        const btnDe = $( 'langDe' );

        if ( btnEn && btnDe ) {
            btnEn.classList.toggle( 'active', this.lang === 'en' );
            btnDe.classList.toggle( 'active', this.lang === 'de' );
        }
    }

    setupButtons () {
        const btnEn = $( 'langEn' );
        const btnDe = $( 'langDe' );

        if ( btnEn ) btnEn.onclick = () => this.switchLanguage( 'en' );
        if ( btnDe ) btnDe.onclick = () => this.switchLanguage( 'de' );
    }

    async switchLanguage ( lang ) {
        if ( lang === this.lang ) return;

        await this.loadTranslations( lang );
        this.updateUI();
    }

}

export const i18n = new I18nManager ();
export const t = ( key ) => i18n.t( key );
