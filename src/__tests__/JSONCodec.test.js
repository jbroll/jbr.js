import { describe, test, expect, beforeEach } from "vitest";
import { JSONCodec } from "../JSONCodec.js";

describe("JSONCodec", () => {
  let mainCodec;
  let shapeCodec;
  let colorCodec;
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
        .delegatesTo(Color, colorCodec)
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

  describe("Class Registration", () => {
    test("verifies class registration in codecs", () => {
      // Check what classes each codec knows about
      // Note: '' represents the base class registration
      expect({
        mainCodecClasses: Array.from(mainCodec.classMap.keys()).sort(),
        shapeCodecClasses: Array.from(shapeCodec.classMap.keys()).sort(),
        colorCodecClasses: Array.from(colorCodec.classMap.keys()).sort(),
      }).toEqual({
        mainCodecClasses: ["", "Drawing"],
        shapeCodecClasses: ["", "Shape"],
        colorCodecClasses: ["", "Color"],
      });

      // Check delegation mappings
      expect({
        drawingClassDelegates: Array.from(Drawing.classCodecs.keys())
          .map((c) => c.name)
          .sort(),
        drawingPropDelegates: Array.from(Drawing.propertyCodecs.keys()),
        shapeClassDelegates: Array.from(Shape.classCodecs.keys()).map(
          (c) => c.name,
        ),
        colorClassDelegates: Array.from(Color.classCodecs.keys()).map(
          (c) => c.name,
        ),
      }).toEqual({
        drawingClassDelegates: ["Color", "Shape"], // Delegates both Shape and Color fields
        drawingPropDelegates: ["specialColor"], // Special handling for specialColor
        shapeClassDelegates: [], // Shape doesn't delegate
        colorClassDelegates: [], // Color doesn't delegate
      });
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

  describe("Serialization", () => {
    test("serializes Color correctly via colorCodec", () => {
      const color = new Color(255, 0, 0);
      const json = colorCodec.stringify(color);
      expect(JSON.parse(json)).toEqual({
        _type: "Color",
        r: 255,
        g: 0,
        b: 0,
      });
    });

    test("serializes Shape correctly via shapeCodec", () => {
      const shape = new Shape(10, 20);
      const json = shapeCodec.stringify(shape);
      expect(JSON.parse(json)).toEqual({
        _type: "Shape",
        x: 10,
        y: 20,
      });
    });

    test("serializes Drawing with delegated fields", () => {
      const shape = new Shape(10, 20);
      const color = new Color(255, 0, 0);
      const specialColor = new Color(0, 255, 0);
      const drawing = new Drawing(shape, color, specialColor);

      const json = mainCodec.stringify(drawing);
      const parsed = JSON.parse(json);

      expect(parsed).toEqual({
        _type: "Drawing",
        shape: {
          _type: "Shape",
          x: 10,
          y: 20,
        },
        color: {
          _type: "Color",
          r: 255,
          g: 0,
          b: 0,
        },
        specialColor: {
          _type: "Color",
          r: 0,
          g: 255,
          b: 0,
        },
        name: "My Drawing",
      });
    });
  });

  describe("Deserialization", () => {
    test("deserializes Color correctly via colorCodec", () => {
      const json = '{"_type":"Color","r":255,"g":0,"b":0}';
      const color = colorCodec.parse(json);
      expect(color instanceof Color).toBe(true);
      expect(color).toEqual({ r: 255, g: 0, b: 0 });
    });

    test("deserializes Shape correctly via shapeCodec", () => {
      const json = '{"_type":"Shape","x":10,"y":20}';
      const shape = shapeCodec.parse(json);
      expect(shape instanceof Shape).toBe(true);
      expect(shape).toEqual({ x: 10, y: 20 });
    });

    test("deserializes Drawing with property delegation", () => {
      const json = `{
        "_type": "Drawing",
        "shape": {"_type":"Shape","x":10,"y":20},
        "color": {"_type":"Color","r":255,"g":0,"b":0},
        "specialColor": {"_type":"Color","r":0,"g":255,"b":0},
        "name": "My Drawing"
      }`;
      const drawing = mainCodec.parse(json);
      expect(drawing instanceof Drawing).toBe(true);
      expect(drawing.shape instanceof Shape).toBe(true);
      expect(drawing.specialColor instanceof Color).toBe(true);
      expect(drawing.color instanceof Color).toBe(true);
    });
  });

  describe("Codec Delegation", () => {
    test("handles class delegation", () => {
      const shape = new Shape(10, 20);
      const color = new Color(255, 0, 0);
      const specialColor = new Color(0, 255, 0);
      const drawing = new Drawing(shape, color, specialColor);

      console.log("\n=== Before Stringify ===");
      console.log("Drawing class codecs:", Drawing.classCodecs);
      console.log("Drawing property codecs:", Drawing.propertyCodecs);
      console.log("Shape class codecs:", Shape.classCodecs);
      console.log("Shape property codecs:", Shape.propertyCodecs);
      console.log("Color class codecs:", Color.classCodecs);
      console.log("Color property codecs:", Color.propertyCodecs);

      const json = mainCodec.stringify(drawing);
      console.log("\n=== JSON ===\n", json);

      const decoded = mainCodec.parse(json);

      console.log("\n=== After Parse ===");
      console.log("Decoded instanceof Drawing:", decoded instanceof Drawing);
      console.log(
        "decoded.shape instanceof Shape:",
        decoded.shape instanceof Shape,
      );
      console.log(
        "decoded.color instanceof Color:",
        decoded.color instanceof Color,
      );
      console.log(
        "decoded.specialColor instanceof Color:",
        decoded.specialColor instanceof Color,
      );

      expect({
        isDrawing: decoded instanceof Drawing,
        actualDrawingType: decoded.constructor.name,
        isShape: decoded.shape instanceof Shape,
        actualShapeType: decoded.shape?.constructor.name,
        isColor: decoded.color instanceof Color,
        actualColorType: decoded.color?.constructor.name,
        isSpecialColor: decoded.specialColor instanceof Color,
        actualSpecialColorType: decoded.specialColor?.constructor.name,
      }).toEqual({
        isDrawing: true,
        actualDrawingType: "Drawing",
        isShape: true,
        actualShapeType: "Shape",
        isColor: true,
        actualColorType: "Color",
        isSpecialColor: true,
        actualSpecialColorType: "Color",
      });

      // Additional property checks
      expect({
        shapeX: decoded.shape.x,
        shapeY: decoded.shape.y,
        colorR: decoded.color.r,
        specialColorG: decoded.specialColor.g,
      }).toEqual({
        shapeX: 10,
        shapeY: 20,
        colorR: 255,
        specialColorG: 255,
      });
    });

    test("handles property-specific delegation", () => {
      const specialColor = new Color(0, 255, 0);
      const drawing = new Drawing(null, null, specialColor);

      const json = mainCodec.stringify(drawing);
      const decoded = mainCodec.parse(json);

      expect({
        isSpecialColor: decoded.specialColor instanceof Color,
        actualType: decoded.specialColor?.constructor.name,
        green: decoded.specialColor?.g,
      }).toEqual({
        isSpecialColor: true,
        actualType: "Color",
        green: 255,
      });
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

      // Detailed assertions for full coverage
      expect({
        decoded1Type: decoded1.constructor.name,
        decoded2Type: decoded2.constructor.name,
        isMultiShape1: decoded1 instanceof MultiShape,
        isMultiShape2: decoded2 instanceof MultiShape,
        decoded1Props: { x: decoded1.x, y: decoded1.y },
        decoded2Props: { x: decoded2.x, y: decoded2.y },
      }).toEqual({
        decoded1Type: "MultiShape",
        decoded2Type: "MultiShape",
        isMultiShape1: true,
        isMultiShape2: true,
        decoded1Props: { x: 10, y: 20 },
        decoded2Props: { x: 10, y: 20 },
      });
    });
  });
});
