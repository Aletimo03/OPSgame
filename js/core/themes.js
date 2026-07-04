// js/core/themes.js
// Colour palettes per area.
// `floor`     — tile face colour (inset rectangle)
// `tileGrout` — grout line colour (full tile background, slightly darker)
// `wall`      — wall ring bordering floors
// `door`      — door pad colour
// `void`      — outside the map
export const THEMES = {
  default: {
    void: 0x15161c, wall: 0x2a2d38,
    floor: 0x3b3f4a, tileGrout: 0x24272f,
    door: 0xc9a23b,
  },

  // Grey tile look everywhere — face ~#888b96, grout ~#6f7278.
  white: {
    void: 0x14151a, wall: 0x565b63,
    floor: 0xDCDCDC, tileGrout: 0xD3D3D3,
    door: 0xb0b5bd,
  },

  // Entrance / lobby — warm wood tiles.
  entrance: {
    void: 0x140f0a, wall: 0x4a3725,
    floor: 0x7b5a3a, tileGrout: 0x5a3d25,
    door: 0xe2c275,
  },
};
