
// Canvas compatibility check for Railway deployment
let canvas;
let hasCanvas = false;

try {
  canvas = require('canvas');
  hasCanvas = true;
  console.log('✅ Canvas available - image features enabled');
} catch (err) {
  console.log('⚠️ Canvas not available in production - image features disabled');
  canvas = null;
  hasCanvas = false;
}

// Mock canvas functions for production
if (!canvas) {
  canvas = {
    createCanvas: (width, height) => ({
      getContext: () => ({
        fillText: () => {},
        fillRect: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(width * height * 4) }),
        putImageData: () => {},
        measureText: () => ({ width: 100 }),
        font: '16px Arial',
        fillStyle: '#ffffff',
        strokeStyle: '#ffffff',
        lineWidth: 1,
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        arc: () => {},
        closePath: () => {},
        fill: () => {}
      }),
      toBuffer: () => Buffer.alloc(0),
      toDataURL: () => 'data:image/png;base64,'
    }),
    loadImage: async (src) => ({
      width: 100,
      height: 100
    }),
    registerFont: () => {}
  };
}

module.exports = { canvas, hasCanvas };
