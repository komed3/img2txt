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

}
