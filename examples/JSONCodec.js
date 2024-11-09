// Example usage showing all delegation scenarios:
const mainCodec = new JSONCodec();
const shapeCodec = new JSONCodec();
const colorCodec = new JSONCodec();
const altShapeCodec = new JSONCodec();

// Shape class with multiple codecs requires delegation by users
class Shape extends JSONCodec.Codec([shapeCodec, altShapeCodec]).register() {
  constructor(x, y) {
    super();
    this.x = x;
    this.y = y;
  }
}

// Single codec class gets auto-delegated
class Color extends JSONCodec.Codec(colorCodec).register() {
  constructor(r, g, b) {
    super();
    this.r = r;
    this.g = g;
    this.b = b;
  }
}

// Drawing shows different delegation methods
class Drawing extends JSONCodec.Codec(mainCodec)
  .delegatesTo(Shape, shapeCodec)        // Class delegation for multi-codec class
  .delegateProp('specialColor', colorCodec)  // Property-specific override
  .register() {
  
  constructor(shape, color, specialColor) {
    super();
    this.shape = shape;       // Uses shapeCodec via delegatesTo
    this.color = color;       // Uses colorCodec via auto-delegation
    this.specialColor = specialColor;  // Uses colorCodec via delegateProp
    this.name = "My Drawing"; // Uses mainCodec as default
  }
}
