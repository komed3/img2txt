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
