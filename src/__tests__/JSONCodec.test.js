import { describe, test, expect, beforeEach } from "vitest";
import { JSONCodec } from "../JSONCodec.js";

describe("JSONCodec", () => {
  let mainCodec;
  let shapeCodec;
  let colorCodec;

  // Basic Class Definitions for Testing
  let Color;
  let Shape;
  let Drawing;

  beforeEach(() => {
    // Create fresh codec instances
    mainCodec = new JSONCodec();
    shapeCodec = new JSONCodec();
    colorCodec = new JSONCodec();

    // Define classes with fresh codecs
    Color = class extends JSONCodec.Codec([colorCodec]).register() {
      constructor(r, g, b) {
        super();
        this.r = r;
        this.g = g;
        this.b = b;
      }
    };
    colorCodec.register(Color);

    Shape = class extends JSONCodec.Codec([shapeCodec]).register() {
      constructor(x, y) {
        super();
        this.x = x;
        this.y = y;
      }
    };
    shapeCodec.register(Shape);

    Drawing = class extends (
      JSONCodec.Codec(mainCodec)
        .delegatesTo(Shape, shapeCodec)
        .delegateProp("specialColor", colorCodec)
        .register()
    ) {
      constructor(shape, color, specialColor) {
        super();
        this.shape = shape;
        this.color = color;
        this.specialColor = specialColor;
        this.name = "My Drawing";
      }
    };
    mainCodec.register(Drawing);
  });

  describe("Basic Serialization and Deserialization", () => {
    test("handles primitive values", () => {
      const values = {
        number: 42,
        string: "hello",
        boolean: true,
        null: null,
        undefined: undefined,
      };

      const json = mainCodec.stringify(values);
      const decoded = mainCodec.parse(json);

      expect(decoded.number).toBe(42);
      expect(decoded.string).toBe("hello");
      expect(decoded.boolean).toBe(true);
      expect(decoded.null).toBeNull();
      expect("undefined" in decoded).toBe(false);
    });

    test("handles arrays", () => {
      const arr = [1, "two", { three: 3 }];
      const json = mainCodec.stringify(arr);
      const decoded = mainCodec.parse(json);
      expect(decoded).toEqual(arr);
    });

    test("handles nested objects", () => {
      const obj = {
        a: {
          b: {
            c: "deep",
          },
        },
      };

      const json = mainCodec.stringify(obj);
      const decoded = mainCodec.parse(json);
      expect(decoded).toEqual(obj);
    });
  });

  describe("Class Registration and Type Preservation", () => {
    test("preserves class types through serialization", () => {
      const color = new Color(255, 128, 0);
      const json = colorCodec.stringify(color);
      const decoded = colorCodec.parse(json);

      expect(decoded instanceof Color).toBe(true);
      expect(decoded.r).toBe(255);
      expect(decoded.g).toBe(128);
      expect(decoded.b).toBe(0);
    });

    test("throws on unregistered class types", () => {
      class UnregisteredClass {}
      const json = `{"_type":"UnregisteredClass"}`;

      expect(() => mainCodec.parse(json)).toThrow(
        'Unknown type "UnregisteredClass" in codec',
      );
    });
  });

  describe("Codec Delegation", () => {
    test("handles class delegation", () => {
      const shape = new Shape(10, 20);
      const color = new Color(255, 0, 0);
      const specialColor = new Color(0, 255, 0);
      const drawing = new Drawing(shape, color, specialColor);

      const json = mainCodec.stringify(drawing);
      const decoded = mainCodec.parse(json);

      expect(decoded instanceof Drawing).toBe(true);
      expect(decoded.shape instanceof Shape).toBe(true);
      expect(decoded.color instanceof Color).toBe(true);
      expect(decoded.specialColor instanceof Color).toBe(true);

      expect(decoded.shape.x).toBe(10);
      expect(decoded.shape.y).toBe(20);
      expect(decoded.color.r).toBe(255);
      expect(decoded.specialColor.g).toBe(255);
    });

    test("handles property-specific delegation", () => {
      const specialColor = new Color(0, 255, 0);
      const drawing = new Drawing(null, null, specialColor);

      const json = mainCodec.stringify(drawing);
      const decoded = mainCodec.parse(json);

      expect(decoded.specialColor instanceof Color).toBe(true);
      expect(decoded.specialColor.g).toBe(255);
    });
  });

  describe("Error Handling", () => {
    test("detects circular references", () => {
      const obj = { a: 1 };
      obj.self = obj;

      expect(() => mainCodec.stringify(obj)).toThrow(
        "Converting circular structure to JSON",
      );
    });

    test("handles deeply nested circular references", () => {
      const obj = { a: { b: { c: {} } } };
      obj.a.b.c.circular = obj;

      expect(() => mainCodec.stringify(obj)).toThrow(
        "Converting circular structure to JSON",
      );
    });

    test("validates codec interface", () => {
      const invalidCodec = {};
      expect(() => JSONCodec.Codec(invalidCodec)).toThrow(
        "Invalid codec: must implement stringify, parse, and register",
      );
    });
  });

  describe("Custom Replacer and Reviver", () => {
    test("supports custom replacer function", () => {
      const obj = { secret: "sensitive", public: "ok" };
      const replacer = (key, value) =>
        key === "secret" ? "[REDACTED]" : value;

      const json = mainCodec.stringify(obj, replacer);
      const decoded = mainCodec.parse(json);

      expect(decoded.secret).toBe("[REDACTED]");
      expect(decoded.public).toBe("ok");
    });

    test("supports custom reviver function", () => {
      const obj = { date: "2024-03-09" };
      const reviver = (key, value) =>
        key === "date" ? new Date(value) : value;

      const json = mainCodec.stringify(obj);
      const decoded = mainCodec.parse(json, reviver);

      expect(decoded.date instanceof Date).toBe(true);
    });
  });

  describe("Multiple Codecs", () => {
    test("handles multiple codec registration", () => {
      const altShapeCodec = new JSONCodec();

      class MultiShape extends JSONCodec.Codec([
        shapeCodec,
        altShapeCodec,
      ]).register() {
        constructor(x, y) {
          super();
          this.x = x;
          this.y = y;
        }
      }

      shapeCodec.register(MultiShape);
      altShapeCodec.register(MultiShape);

      const shape = new MultiShape(10, 20);
      const json1 = shapeCodec.stringify(shape);
      const json2 = altShapeCodec.stringify(shape);
      const decoded1 = shapeCodec.parse(json1);
      const decoded2 = altShapeCodec.parse(json2);

      expect(decoded1 instanceof MultiShape).toBe(true);
      expect(decoded2 instanceof MultiShape).toBe(true);
      expect(decoded1).toEqual(decoded2);
    });

    test("requires explicit delegation for multi-codec classes", () => {
      const altShapeCodec = new JSONCodec();

      class MultiShape extends JSONCodec.Codec([
        shapeCodec,
        altShapeCodec,
      ]).register() {
        constructor(x, y) {
          super();
          this.x = x;
          this.y = y;
        }
      }

      expect(() => {
        class Container extends JSONCodec.Codec(mainCodec) {
          constructor(shape) {
            super();
            this.shape = new MultiShape(0, 0);
          }
        }
        Container.register();
      }).toThrow(/Property shape has multiple possible codecs/);
    });
  });
});
