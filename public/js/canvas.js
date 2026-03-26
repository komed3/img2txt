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
    if ( ! currentImageWidth ) return;

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

// Interaction Logic

function getMousePos ( e ) {
    const rect = overlayCanvas.getBoundingClientRect();
    const scaleX = overlayCanvas.width / rect.width;
    const scaleY = overlayCanvas.height / rect.height;

    return {
        x: ( e.clientX - rect.left ) * scaleX - OVERLAY_PAD,
        y: ( e.clientY - rect.top ) * scaleY - OVERLAY_PAD
    };
}

function checkHit ( x, y ) {
    for ( let i = regions.length - 1; i >= 0; i-- ) {
        const r = regions[ i ];

        if ( i === activeRegionIndex ) {
            const hsz = ( HANDLE_SIZE * 2 ) / userZoom;
            if ( Math.abs( x - r.x ) < hsz && Math.abs( y - r.y ) < hsz ) return { index: i, type: 'resize-tl' };
            if ( Math.abs( x - ( r.x + r.w ) ) < hsz && Math.abs( y - r.y ) < hsz ) return { index: i, type: 'resize-tr' };
            if ( Math.abs( x - r.x ) < hsz && Math.abs( y - ( r.y + r.h ) ) < hsz ) return { index: i, type: 'resize-bl' };
            if ( Math.abs( x - ( r.x + r.w ) ) < hsz && Math.abs( y - ( r.y + r.h ) ) < hsz ) return { index: i, type: 'resize-br' };
        }

        if ( x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h ) return { index: i, type: 'move' };
    }

    return null;
}

function onMouseDown ( e ) {
    if ( document.getElementById( 'step2' ).classList.contains( 'active-step' ) === false ) return;
    if ( e.target.closest( '.zoom-overlay' ) || e.target.closest( '.pagination' ) ) return;

    if ( e.ctrlKey || e.button === 1 ) {
        e.preventDefault(); 

        draggingState = 'pan';
        startX = e.clientX;
        startY = e.clientY;
        workspace.style.cursor = 'grabbing';

        return;
    }

    overlayCanvas.focus();

    const pos = getMousePos( e );
    startX = pos.x;
    startY = pos.y;

    const hit = checkHit( pos.x, pos.y );
    if ( hit ) {
        activeRegionIndex = hit.index;
        draggingState = hit.type;
        initialRegionState = { ...regions[ activeRegionIndex ] };
    } else {
        draggingState = 'create';
        activeRegionIndex = regions.length;
        regions.push( { x: startX, y: startY, w: 0, h: 0 } );
    }

    refreshOverlay();
}

function onMouseMove ( e ) {
    if ( document.getElementById( 'step2' ).classList.contains( 'active-step' ) === false ) return;

    if ( draggingState === 'pan' ) {
        panX += e.clientX - startX;
        panY += e.clientY - startY;
        startX = e.clientX;
        startY = e.clientY;
        workspace.style.cursor = 'grabbing';

        applyZoom();

        return;
    }

    const pos = getMousePos( e );

    if ( ! draggingState ) {
        if ( e.ctrlKey ) {
            workspace.style.cursor = 'grab';
            return;
        }

        let newHoverIndex = -1;
        const hit = checkHit( pos.x, pos.y );

        if ( e.target === overlayCanvas || e.target === documentCanvas || e.target === wrapper ) {
            if ( hit ) {
                newHoverIndex = hit.index;

                if ( hit.type.startsWith( 'resize-tl' ) || hit.type.startsWith( 'resize-br' ) ) workspace.style.cursor = 'nwse-resize';
                else if ( hit.type.startsWith( 'resize-tr' ) || hit.type.startsWith( 'resize-bl' ) ) workspace.style.cursor = 'nesw-resize';
                else workspace.style.cursor = 'move';
            }
            else workspace.style.cursor = 'crosshair';
        }
        else workspace.style.cursor = 'grab';

        if ( newHoverIndex !== hoverRegionIndex ) {
            hoverRegionIndex = newHoverIndex;
            refreshOverlay();
        }

        return;
    }

    const dx = pos.x - startX;
    const dy = pos.y - startY;
    const r = regions[ activeRegionIndex ];
    if ( ! r ) return;

    if ( draggingState === 'create' ) {
        r.x = dx < 0 ? pos.x : startX;
        r.y = dy < 0 ? pos.y : startY;
        r.w = Math.abs( dx );
        r.h = Math.abs( dy );
    } else if ( draggingState === 'move' ) {
        r.x = initialRegionState.x + dx;
        r.y = initialRegionState.y + dy;
    } else if ( draggingState === 'resize-tl' ) {
        r.x = initialRegionState.x + dx;
        r.y = initialRegionState.y + dy;
        r.w = initialRegionState.w - dx;
        r.h = initialRegionState.h - dy;
    } else if ( draggingState === 'resize-tr' ) {
        r.y = initialRegionState.y + dy;
        r.w = initialRegionState.w + dx;
        r.h = initialRegionState.h - dy;
    } else if ( draggingState === 'resize-bl' ) {
        r.x = initialRegionState.x + dx;
        r.w = initialRegionState.w - dx;
        r.h = initialRegionState.h + dy;
    } else if ( draggingState === 'resize-br' ) {
        r.w = initialRegionState.w + dx;
        r.h = initialRegionState.h + dy;
    }

    if ( draggingState.startsWith( 'resize' ) ) {
        if ( r.w < MIN_SIZE ) {
            r.w = MIN_SIZE;

            if ( draggingState.includes( 'l' ) ) r.x = initialRegionState.x + initialRegionState.w - MIN_SIZE;
        }
        if ( r.h < MIN_SIZE ) {
            r.h = MIN_SIZE;

            if ( draggingState.includes( 't' ) ) r.y = initialRegionState.y + initialRegionState.h - MIN_SIZE;
        }
    }

    refreshOverlay();
}

function onMouseUp ( e ) {
    if ( ! draggingState ) return;
    if ( draggingState === 'pan' ) {
        draggingState = null;
        workspace.style.cursor = ( e && e.target && (
            e.target === overlayCanvas ||
            e.target === documentCanvas ||
            e.target === wrapper
        ) ) ? 'crosshair' : 'grab';

        return;
    }

    if ( draggingState === 'create' ) {
        const r = regions[ activeRegionIndex ];

        if ( r && ( r.w < MIN_SIZE || r.h < MIN_SIZE ) ) {
            regions.pop();
            activeRegionIndex = -1;
        }
    }

    draggingState = null;
    initialRegionState = null;

    refreshOverlay();
}

function drawHandle ( x, y ) {
    const sz = HANDLE_SIZE / ( baseScale * userZoom );
    overCtx.fillStyle = '#fff';
    overCtx.fillRect( x - sz / 2, y - sz / 2, sz, sz );
    overCtx.lineWidth = 2 / ( baseScale * userZoom );
    overCtx.strokeRect( x - sz / 2, y - sz / 2, sz, sz );
}

function refreshOverlay () {
    overCtx.save();
    overCtx.setTransform( 1, 0, 0, 1, 0, 0 );
    overCtx.clearRect( 0, 0, overlayCanvas.width, overlayCanvas.height );
    overCtx.translate( OVERLAY_PAD, OVERLAY_PAD ); 

    const strokeW = 3 / ( baseScale * userZoom );
    const fontSize = Math.max( 14, 20 / ( baseScale * userZoom ) );

    regions.forEach( ( r, idx ) => {
        const isActive = ( idx === activeRegionIndex );
        const isHover = ( idx === hoverRegionIndex );

        let strokeColor, fillColor;
        if ( isActive ) {
            strokeColor = 'rgba( 37 99 235 / 1 )';
            fillColor = 'rgba( 37 99 235 / 0.15 )';
        } else if ( isHover ) {
            strokeColor = 'rgba( 15 76 129 / 0.9 )';
            fillColor = 'rgba( 15 76 129 / 0.1 )';
        } else {
            strokeColor = 'rgba( 15 76 129 / 0.3 )';
            fillColor = 'rgba( 15 76 129 / 0.03 )';
        }

        overCtx.strokeStyle = strokeColor;
        overCtx.lineWidth = strokeW;
        overCtx.fillStyle = fillColor;
        overCtx.fillRect( r.x, r.y, r.w, r.h );
        overCtx.strokeRect( r.x, r.y, r.w, r.h );

        const badgeSz = fontSize * 1.5;
        overCtx.fillStyle = isActive ? strokeColor : ( isHover ? strokeColor : 'rgba( 15 76 129 / 0.8 )' );
        overCtx.fillRect( r.x, r.y, badgeSz, badgeSz );
        overCtx.fillStyle = 'white';
        overCtx.font = `bold ${fontSize}px Inter, sans-serif`;
        overCtx.textAlign = 'center';
        overCtx.textBaseline = 'middle';
        overCtx.fillText( ( idx + 1 ).toString(), r.x + badgeSz / 2, r.y + badgeSz / 2 );

        if ( isActive || isHover ) {
            overCtx.strokeStyle = strokeColor;

            drawHandle( r.x, r.y );
            drawHandle( r.x + r.w, r.y );
            drawHandle( r.x, r.y + r.h );
            drawHandle( r.x + r.w, r.y + r.h );
        }
    } );

    overCtx.restore();
}

// Binds

function zoomBtn ( delta ) {
    const newZoom = Math.max( 0.2, Math.min( 5, userZoom + delta ) );

    if ( newZoom !== userZoom ) {
        const oldScale = baseScale * userZoom;
        const newScale = baseScale * newZoom;
        userZoom = newZoom;

        const centerX = workspace.clientWidth / 2;
        const centerY = workspace.clientHeight / 2;
        panX = centerX - ( ( centerX - panX ) / oldScale ) * newScale;
        panY = centerY - ( ( centerY - panY ) / oldScale ) * newScale;

        applyZoom();
    }
}

zoomInBtn.addEventListener( 'click', () => zoomBtn( 0.2 ) );
zoomOutBtn.addEventListener( 'click', () => zoomBtn( -0.2 ) );
zoomResetBtn.addEventListener( 'click', resetZoom );

workspace.addEventListener( 'wheel', ( e ) => {
    if ( document.getElementById( 'step2' ).classList.contains( 'active-step' ) === false ) return;
    e.preventDefault();

    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max( 0.2, Math.min( 5, userZoom + zoomDelta ) );

    if ( newZoom !== userZoom ) {
        const oldScale = baseScale * userZoom;
        const newScale = baseScale * newZoom;
        userZoom = newZoom;

        const workRect = workspace.getBoundingClientRect();
        const mouseX = e.clientX - workRect.left;
        const mouseY = e.clientY - workRect.top;
        panX = mouseX - ( ( mouseX - panX ) / oldScale ) * newScale;
        panY = mouseY - ( ( mouseY - panY ) / oldScale ) * newScale;

        applyZoom();
    }
}, { passive: false } );

overlayCanvas.addEventListener( 'keydown', ( e ) => {
    if ( ( e.key === 'Delete' || e.key === 'Backspace' ) && activeRegionIndex !== -1 ) {
        e.preventDefault();

        regions.splice( activeRegionIndex, 1 );
        activeRegionIndex = -1;

        refreshOverlay();
    }
} );

// Disable middle click autoscroll globally
document.addEventListener( 'mousedown', ( e ) => {
    if ( e.button === 1 ) e.preventDefault();
} );

workspace.addEventListener( 'mousedown', onMouseDown );
window.addEventListener( 'mousemove', onMouseMove );
window.addEventListener( 'mouseup', onMouseUp );
window.addEventListener( 'resize', resetZoom );
