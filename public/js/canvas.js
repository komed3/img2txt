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
        this.overCanvas.style.left = -this.OVERLAY_PAD + "px";
        this.overCanvas.style.top = -this.OVERLAY_PAD + "px";

        this.resetZoom();
    }

}
