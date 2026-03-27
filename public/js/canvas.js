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

    onMouseDown ( e ) {
        if ( ! $( 'step2' ).classList.contains( 'active-step' ) ) return;
        if ( e.target.closest( '.zoom-overlay' ) || e.target.closest( '.pagination' ) ) return;

        if ( e.ctrlKey || e.button === 1 ) {
            e.preventDefault();
 
            this.draggingState = 'pan';
            this.startX = e.clientX;
            this.startY = e.clientY;
            this.workspace.style.cursor = 'grabbing';

            return;
        }

        this.overCanvas.focus();
        const pos = this.getMousePos( e );
        const hit = this.checkHit( pos.x, pos.y );
        this.startX = pos.x;
        this.startY = pos.y;

        if ( hit ) {
            this.activeRegionIndex = hit.index;
            this.draggingState = hit.type;
            this.initialRegionState = { ...this.regions[ this.activeRegionIndex ] };
        } else {
            this.draggingState = 'create';
            this.activeRegionIndex = this.regions.length;
            this.regions.push( { x: this.startX, y: this.startY, w: 0, h: 0 } );
        }

        this.refreshOverlay();
    }

    onMouseMove ( e ) {
        if ( ! $( 'step2' ).classList.contains( 'active-step' ) ) return;

        if ( this.draggingState === 'pan' ) {
            this.panX += e.clientX - this.startX;
            this.panY += e.clientY - this.startY;
            this.startX = e.clientX;
            this.startY = e.clientY;

            this.applyZoom();
            this.workspace.style.cursor = 'grabbing';

            return;
        }

        const pos = this.getMousePos( e );

        if ( ! this.draggingState ) {
            if ( e.ctrlKey ) { this.workspace.style.cursor = 'grab'; return; }

            const hit = this.checkHit( pos.x, pos.y );
            let newHoverIndex = -1;

            if ( e.target === this.overCanvas || e.target === this.docCanvas || e.target === this.wrapper ) {
                if ( hit ) {
                    newHoverIndex = hit.index;

                    if ( hit.type.startsWith( 'resize-tl' ) || hit.type.startsWith( 'resize-br' ) ) this.workspace.style.cursor = 'nwse-resize';
                    else if ( hit.type.startsWith( 'resize-tr' ) || hit.type.startsWith( 'resize-bl' ) ) this.workspace.style.cursor = 'nesw-resize';
                    else this.workspace.style.cursor = 'move';
                } else {
                    this.workspace.style.cursor = 'crosshair';
                }
            } else {
                this.workspace.style.cursor = 'default';
            }

            if ( newHoverIndex !== this.hoverRegionIndex ) {
                this.hoverRegionIndex = newHoverIndex;
                this.refreshOverlay();
            }

            return;
        }

        const dx = pos.x - this.startX;
        const dy = pos.y - this.startY;
        const r = this.regions[ this.activeRegionIndex ];
        if ( ! r ) return;

        switch ( this.draggingState ) {
            case 'create':
                r.x = dx < 0 ? pos.x : this.startX;
                r.y = dy < 0 ? pos.y : this.startY;
                r.w = Math.abs( dx );
                r.h = Math.abs( dy );
                break;
            case 'move':
                r.x = this.initialRegionState.x + dx;
                r.y = this.initialRegionState.y + dy;
                break;
            case 'resize-tl':
                r.x = this.initialRegionState.x + dx;
                r.y = this.initialRegionState.y + dy;
                r.w = this.initialRegionState.w - dx;
                r.h = this.initialRegionState.h - dy;
                break;
            case 'resize-tr':
                r.y = this.initialRegionState.y + dy;
                r.w = this.initialRegionState.w + dx;
                r.h = this.initialRegionState.h - dy;
                break;
            case 'resize-bl':
                r.x = this.initialRegionState.x + dx;
                r.w = this.initialRegionState.w - dx;
                r.h = this.initialRegionState.h + dy;
                break;
            case 'resize-br':
                r.w = this.initialRegionState.w + dx;
                r.h = this.initialRegionState.h + dy;
                break;
        }

        if ( this.draggingState.startsWith( 'resize' ) ) {
            if ( r.w < this.MIN_SIZE ) {
                r.w = this.MIN_SIZE;

                if ( this.draggingState.includes( 'l' ) ) r.x = this.initialRegionState.x + this.initialRegionState.w - this.MIN_SIZE;
            }

            if ( r.h < this.MIN_SIZE ) {
                r.h = this.MIN_SIZE;

                if ( this.draggingState.includes( 't' ) ) r.y = this.initialRegionState.y + this.initialRegionState.h - this.MIN_SIZE;
            }
        }

        this.refreshOverlay();
    }

    onMouseUp () {
        if ( ! this.draggingState ) return;

        if ( this.draggingState === 'pan' ) {
            this.draggingState = null;
            this.workspace.style.cursor = 'default';

            return;
        }

        if ( this.draggingState === 'create' ) {
            const r = this.regions[ this.activeRegionIndex ];

            if ( r && ( r.w < this.MIN_SIZE || r.h < this.MIN_SIZE ) ) {
                this.regions.pop();
                this.activeRegionIndex = -1;
            }
        }

        this.draggingState = null;
        this.initialRegionState = null;

        this.refreshOverlay();
    }

}
