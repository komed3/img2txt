import { $ } from './utils.js';

export class ThemeManager {

    constructor () {
        this.STORAGE_KEY = 'img2txt-theme';
        this.themeIcon = $( 'themeIconUse' );
        this.toggleBtn = $( 'themeToggleBtn' );
        this.initTheme();
    }

    initTheme () {
        if ( ! this.toggleBtn || ! this.themeIcon ) return;

        const savedTheme = localStorage.getItem( this.STORAGE_KEY );
        const systemDark = window.matchMedia && window.matchMedia( '(prefers-color-scheme: dark)' ).matches;

        if ( savedTheme === 'dark' || ( ! savedTheme && systemDark ) ) this.setDarkTheme();
        else this.setLightTheme();

        this.toggleBtn.addEventListener( 'click', () => this.toggleTheme() );
    }

    setDarkTheme () {
        document.documentElement.className = 'dark-theme';
        localStorage.setItem( this.STORAGE_KEY, 'dark' );

        this.themeIcon.setAttribute( 'href', 'assets/images/icons.svg#icon-sun' );
        if ( $( 'appLogoImg' ) ) $( 'appLogoImg' ).src = 'assets/images/logo-dark.svg';
    }

    setLightTheme () {
        document.documentElement.className = 'light-theme';
        localStorage.setItem( this.STORAGE_KEY, 'light' );

        this.themeIcon.setAttribute( 'href', 'assets/images/icons.svg#icon-moon' );
        if ( $( 'appLogoImg' ) ) $( 'appLogoImg' ).src = 'assets/images/logo.svg';
    }

    toggleTheme () {
        if ( document.documentElement.className === 'dark-theme' ) this.setLightTheme();
        else this.setDarkTheme();
    }

}
