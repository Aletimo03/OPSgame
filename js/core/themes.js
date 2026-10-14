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
  // Plain light floor + WHITE walls (the real building's walls are white).
  // `wallStyle` turns on the 3/4 white-wall drawing in MapRenderer:
  //   wallFace  — a wall whose front faces you (floor right below it)
  //   wallTop   — the darker band along a front wall's top edge
  //   wallBase  — the skirting board at the bottom of a front wall
  //   wallEdge  — thin line where any wall meets the floor
  white: {
    void: 0x14151a, wall: 0xe9eaed,
    floor: 0xDCDCDC, tileGrout: 0xD3D3D3,
    door: 0xb0b5bd,
    wallStyle: true,
    wallFace: 0xf8f8f6, wallTop: 0xd9dce1, wallBase: 0xc6cad1, wallEdge: 0xa3a9b2,
  },

  // Entrance / lobby — warm wood tiles.
  entrance: {
    void: 0x140f0a, wall: 0x4a3725,
    floor: 0x7b5a3a, tileGrout: 0x5a3d25,
    door: 0xe2c275,
  },
};
