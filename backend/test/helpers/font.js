const { createHash } = require('node:crypto');

const opentype = require('opentype.js');

function buildTestFontBuffer() {
  const notdef = new opentype.Glyph({
    name: '.notdef',
    unicode: 0,
    advanceWidth: 600,
    path: new opentype.Path(),
  });

  const aPath = new opentype.Path();
  aPath.moveTo(100, 0);
  aPath.lineTo(300, 700);
  aPath.lineTo(500, 0);
  aPath.lineTo(420, 0);
  aPath.lineTo(365, 180);
  aPath.lineTo(235, 180);
  aPath.lineTo(180, 0);
  aPath.close();

  const capitalA = new opentype.Glyph({
    name: 'A',
    unicode: 65,
    advanceWidth: 600,
    path: aPath,
  });

  const font = new opentype.Font({
    familyName: 'Workflow Test Sans',
    styleName: 'Regular',
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs: [notdef, capitalA],
  });

  const arrayBuffer = font.toArrayBuffer();
  return Buffer.from(arrayBuffer);
}

function sha256Hex(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

module.exports = {
  buildTestFontBuffer,
  sha256Hex,
};
