import { describe, test, expect } from 'vitest';
import { JSONCodec } from '../JSONCodec';

describe('JSONCodec', () => {
  test('basic serialization and deserialization', () => {
    const mainCodec = new JSONCodec();
    const shapeCodec = new JSONCodec();
    
    class Shape extends JSONCodec.Codec([shapeCodec]).register() {
      constructor(x, y) {
        super();
        this.x = x;
        this.y = y;
      }
    }
    
    const shape = new Shape(10, 20);
    const json = shapeCodec.stringify(shape);
    const decoded = shapeCodec.parse(json);
    
    expect(decoded).toBeInstanceOf(Shape);
    expect(decoded.x).toBe(10);
    expect(decoded.y).toBe(20);
  });
});