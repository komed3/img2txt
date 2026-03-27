import { $ } from './utils.js';

export class CanvasWorkspace {

    constructor () {
        this.docCanvas = $( 'documentCanvas' );
        this.docCtx = this.docCanvas.getContext( '2d' );
        this.overCanvas = $( 'overlayCanvas' );
        this.overCtx = this.overCanvas.getContext( '2d' );
        this.wrapper = $( 'canvasWrapper' );
        this.workspace = $( 'workspace' );

        this.currentImageWidth = 0;
        this.currentImageHeight = 0;

        // Virtual sizing for hardware limit protection (20k fix)
        this.renderScale = 1.0; 
        this.MAX_CANVAS_DIM = 4096; 

        this.baseScale = 1; 
        this.userZoom = 1;  
        this.panX = 0;
        this.panY = 0;

        this.regions = [];
        this.draggingState = null; 
        this.activeRegionIndex = -1; 
        this.hoverRegionIndex = -1;
        this.startX = 0;
        this.startY = 0;

        this.OVERLAY_PAD = 2000;
        this.HANDLE_SIZE = 8;
        this.MIN_SIZE = 15;

        this.init();
    }

    init () {
        $( 'zoomInBtn' ).onclick = () => this.zoomBtn( 0.2 );
        $( 'zoomOutBtn' ).onclick = () => this.zoomBtn( -0.2 );
        $( 'zoomResetBtn' ).onclick = () => this.resetZoom();

        this.workspace.onwheel = ( e ) => this.handleWheel( e );
        this.workspace.onmousedown = ( e ) => this.onMouseDown( e );
        window.onmousemove = ( e ) => this.onMouseMove( e );
        window.onmouseup = ( e ) => this.onMouseUp( e );
        window.onresize = () => this.resetZoom();

        this.overCanvas.onkeydown = ( e ) => this.handleKeys( e );

        // Block middle click autoscroll
        document.addEventListener( 'mousedown', ( e ) => {
            if ( e.button === 1 ) e.preventDefault(); 
        }, { passive: false } );
    }

    getRegions () {
        return this.regions;
    }

    setupCanvas ( width, height ) {
        this.currentImageWidth = width;
        this.currentImageHeight = height;

        // Protection against hardware canvas limits (e.g. 20.000px)
        this.renderScale = 1.0;
        if ( width > this.MAX_CANVAS_DIM || height > this.MAX_CANVAS_DIM ) {
            this.renderScale = Math.min( this.MAX_CANVAS_DIM / width, this.MAX_CANVAS_DIM / height );
        }

        const virtualW = width * this.renderScale;
        const virtualH = height * this.renderScale;

        this.docCanvas.width = virtualW;
        this.docCanvas.height = virtualH;

        this.overCanvas.width = virtualW + this.OVERLAY_PAD * 2;
        this.overCanvas.height = virtualH + this.OVERLAY_PAD * 2;
        this.overCanvas.style.left = -this.OVERLAY_PAD + 'px';
        this.overCanvas.style.top = -this.OVERLAY_PAD + 'px';

        this.resetZoom();
    }

    calculateBaseScale () {
        if ( ! this.currentImageWidth ) return;

        const parentW = this.workspace.clientWidth - 40; 
        const parentH = this.workspace.clientHeight - 40;        
        const virtualW = this.currentImageWidth * this.renderScale;
        const virtualH = this.currentImageHeight * this.renderScale;

        this.baseScale = Math.min( ( parentW / virtualW ), ( parentH / virtualH ), 1 );

        const scaledW = virtualW * this.baseScale * this.userZoom;
        const scaledH = virtualH * this.baseScale * this.userZoom;

        this.panX = ( this.workspace.clientWidth - scaledW ) / 2;
        this.panY = ( this.workspace.clientHeight - scaledH ) / 2;
    }

    applyZoom () {
        if ( ! this.currentImageWidth ) return;

        const virtualW = this.currentImageWidth * this.renderScale;
        const virtualH = this.currentImageHeight * this.renderScale;

        this.wrapper.style.width = virtualW + 'px';
        this.wrapper.style.height = virtualH + 'px';

        const currentScale = this.baseScale * this.userZoom;

        this.wrapper.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${currentScale})`;
        $( 'zoomLevelDisplay' ).textContent = Math.round( this.userZoom * 100 ) + '%';
    }

    resetZoom () {
        this.userZoom = 1;
        this.calculateBaseScale();
        this.applyZoom();
    }

    clearRegions () {
        this.regions = [];
        this.activeRegionIndex = -1;
        this.refreshOverlay();
    }

    getDocContext () {
        return this.docCtx;
    }

    getScaleRatio () {
        return this.renderScale;
    }

    async cropRegionToBlob ( region ) {
        // We crop from the Virtual Canvas but using Original Ratios
        const tempCanvas = document.createElement( 'canvas' );
        tempCanvas.width = region.w / this.renderScale;
        tempCanvas.height = region.h / this.renderScale;

        const tempCtx = tempCanvas.getContext( '2d' );
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect( 0, 0, tempCanvas.width, tempCanvas.height );

        // Draw from scaled source to full size destination
        tempCtx.drawImage(
            this.docCanvas, region.x, region.y, region.w, region.h,
            0, 0, tempCanvas.width, tempCanvas.height
        );

        return new Promise ( res => tempCanvas.toBlob( res, 'image/png' ) );
    }

    async getDocumentBlob () {
        // If we downscaled, we might want the original, but for OCR 4096px is usually plenty.
        // Let's return the docCanvas blob.
        return new Promise ( res => this.docCanvas.toBlob( res, 'image/png' ) );
    }

    // --- Interaction ---

    getMousePos ( e ) {
        const rect = this.overCanvas.getBoundingClientRect();
        const scaleX = this.overCanvas.width / rect.width;
        const scaleY = this.overCanvas.height / rect.height;

        return {
            x: ( e.clientX - rect.left ) * scaleX - this.OVERLAY_PAD,
            y: ( e.clientY - rect.top ) * scaleY - this.OVERLAY_PAD
        };
    }

    checkHit ( x, y ) {
        for ( let i = this.regions.length - 1; i >= 0; i-- ) {
            const r = this.regions[ i ];

            if ( i === this.activeRegionIndex ) {
                const hsz = ( this.HANDLE_SIZE * 2 ) / this.userZoom;
                const corners = [
                    { x: r.x, y: r.y, type: 'resize-tl' },
                    { x: r.x + r.w, y: r.y, type: 'resize-tr' },
                    { x: r.x, y: r.y + r.h, type: 'resize-bl' },
                    { x: r.x + r.w, y: r.y + r.h, type: 'resize-br' }
                ];

                for ( let { x: cx, y: cy, type } of corners ) {
                    if ( Math.abs( x - cx ) < hsz && Math.abs( y - cy ) < hsz ) return { index: i, type };
                }
            }

            if ( x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h ) return { index: i, type: 'move' };
        }

        return null;
    }

}
