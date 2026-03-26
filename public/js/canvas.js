export const documentCanvas = document.getElementById( 'documentCanvas' );
export const docCtx = documentCanvas.getContext( '2d' );

const overlayCanvas = document.getElementById( 'overlayCanvas' );
const overCtx = overlayCanvas.getContext( '2d' );
const wrapper = document.getElementById( 'canvasWrapper' );
const workspace = document.getElementById( 'workspace' );
const zoomLevelDisplay = document.getElementById( 'zoomLevelDisplay' );
const zoomInBtn = document.getElementById( 'zoomInBtn' );
const zoomOutBtn = document.getElementById( 'zoomOutBtn' );
const zoomResetBtn = document.getElementById( 'zoomResetBtn' );

let currentImageWidth = 0;
let currentImageHeight = 0;
let baseScale = 1;
let userZoom = 1;
let panX = 0;
let panY = 0;

let regions = [];
let draggingState = null;
let activeRegionIndex = -1;
let hoverRegionIndex = -1;
let startX = 0, startY = 0;
let initialRegionState = null;

const OVERLAY_PAD = 2000;
const HANDLE_SIZE = 8;
const MIN_SIZE = 15;

export function getRegions () { return regions }

export function setupCanvas ( width, height ) {
    currentImageWidth = width;
    currentImageHeight = height;

    documentCanvas.width = width;
    documentCanvas.height = height;

    overlayCanvas.width = width + OVERLAY_PAD * 2;
    overlayCanvas.height = height + OVERLAY_PAD * 2;
    overlayCanvas.style.left = -OVERLAY_PAD + 'px';
    overlayCanvas.style.top = -OVERLAY_PAD + 'px';

    resetZoom();
}

function calculateBaseScale () {
    if ( ! currentImageWidth ) return;

    const parentW = workspace.clientWidth - 40;
    const parentH = workspace.clientHeight - 40;
    baseScale = Math.min( ( parentW / currentImageWidth ), ( parentH / currentImageHeight ), 1 );

    const scaledW = currentImageWidth * baseScale * userZoom;
    const scaledH = currentImageHeight * baseScale * userZoom;
    panX = ( workspace.clientWidth - scaledW ) / 2;
    panY = ( workspace.clientHeight - scaledH ) / 2;
}

function applyZoom () {
    if( ! currentImageWidth ) return;

    wrapper.style.width = currentImageWidth + 'px';
    wrapper.style.height = currentImageHeight + 'px';

    const currentScale = baseScale * userZoom;
    wrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${currentScale})`;
    zoomLevelDisplay.textContent = Math.round( userZoom * 100 ) + '%';
}

export function resetZoom () {
    userZoom = 1;
    calculateBaseScale();
    applyZoom();
}

export function clearRegions () {
    regions = [];
    activeRegionIndex = -1;
    refreshOverlay();
}

export function cropRegionToBlob ( region ) {
    return new Promise ( ( resolve ) => {
        const tempCanvas = document.createElement( 'canvas' );
        tempCanvas.width = region.w;
        tempCanvas.height = region.h;

        const tempCtx = tempCanvas.getContext( '2d' );
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect( 0, 0, region.w, region.h );
        tempCtx.drawImage( documentCanvas, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h );
        tempCanvas.toBlob( ( blob ) => resolve( blob ), 'image/png' );
    } );
}

export function getDocumentBlob () {
    return new Promise ( resolve => documentCanvas.toBlob( resolve, 'image/png' ) );
}
