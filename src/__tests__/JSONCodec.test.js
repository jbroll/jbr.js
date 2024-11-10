// JSONCodec.test.js
import { describe, test, expect, beforeEach } from "vitest";
import { JSONCodec } from "../JSONCodec.js";

describe("JSONCodec", () => {
  let codec;
  let Color;
  let Shape;
  let Drawing;

  beforeEach(() => {
    codec = new JSONCodec();

    // Define test classes
    Color = class {
      constructor(r, g, b) {
        this.r = r;
        this.g = g;
        this.b = b;
      }
    };
    JSONCodec.withJSON(Color);

    Shape = class {
      constructor(x, y) {
        this.x = x;
        this.y = y;
      }
    };
    JSONCodec.withJSON(Shape);

    Drawing = class {
      constructor(shape, color) {
        this.shape = shape;
        this.color = color;
        this.name = "My Drawing";
      }
    };
    JSONCodec.withJSON(Drawing);

    // Register classes with codec
    codec.register(Color).register(Shape).register(Drawing);
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

      const json = codec.stringify(values);
      const decoded = codec.parse(json);

      expect(decoded.number).toBe(42);
      expect(decoded.string).toBe("hello");
      expect(decoded.boolean).toBe(true);
      expect(decoded.null).toBeNull();
      expect("undefined" in decoded).toBe(false);
    });

    test("handles arrays", () => {
      const arr = [1, "two", { three: 3 }];
      const json = codec.stringify(arr);
      const decoded = codec.parse(json);
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

      const json = codec.stringify(obj);
      const decoded = codec.parse(json);
      expect(decoded).toEqual(obj);
    });
  });

  describe("Class Serialization", () => {
    test("serializes and deserializes class instances", () => {
      const color = new Color(255, 128, 0);
      const json = codec.stringify(color);
      const decoded = codec.parse(json);

      expect(decoded instanceof Color).toBe(true);
      expect(decoded.r).toBe(255);
      expect(decoded.g).toBe(128);
      expect(decoded.b).toBe(0);
    });

    test("handles nested class instances", () => {
      const shape = new Shape(10, 20);
      const color = new Color(255, 0, 0);
      const drawing = new Drawing(shape, color);

      const json = codec.stringify(drawing);
      const decoded = codec.parse(json);

      expect(decoded instanceof Drawing).toBe(true);
      expect(decoded.shape instanceof Shape).toBe(true);
      expect(decoded.color instanceof Color).toBe(true);
      expect(decoded.shape.x).toBe(10);
      expect(decoded.color.r).toBe(255);
    });

    test("throws on unregistered class types", () => {
      class UnregisteredClass {}
      JSONCodec.withJSON(UnregisteredClass);

      const instance = new UnregisteredClass();
      const json = codec.stringify(instance);

      expect(() => codec.parse(json)).toThrow(
        'Unknown type "UnregisteredClass" in codec',
      );
    });
  });

  describe("Error Handling", () => {
    test("detects circular references", () => {
      const obj = { a: 1 };
      obj.self = obj;

      expect(() => codec.stringify(obj)).toThrow(
        "Converting circular structure to JSON",
      );
    });

    test("handles deeply nested circular references", () => {
      const obj = { a: { b: { c: {} } } };
      obj.a.b.c.circular = obj;

      expect(() => codec.stringify(obj)).toThrow(
        "Converting circular structure to JSON",
      );
    });
  });

  describe("Custom Replacer and Reviver", () => {
    test("supports custom replacer function", () => {
      const obj = { secret: "sensitive", public: "ok" };
      const replacer = (key, value) =>
        key === "secret" ? "[REDACTED]" : value;

      const json = codec.stringify(obj, replacer);
      const decoded = codec.parse(json);

      expect(decoded.secret).toBe("[REDACTED]");
      expect(decoded.public).toBe("ok");
    });

    test("supports custom reviver function", () => {
      const obj = { date: "2024-03-09" };
      const reviver = (key, value) =>
        key === "date" ? new Date(value) : value;

      const json = codec.stringify(obj);
      const decoded = codec.parse(json, reviver);

      expect(decoded.date instanceof Date).toBe(true);
    });
  });

  describe("Advanced Serialization Scenarios", () => {
    test("handles arrays of class instances", () => {
      const colors = [
        new Color(255, 0, 0),
        new Color(0, 255, 0),
        new Color(0, 0, 255),
      ];

      const json = codec.stringify(colors);
      const decoded = codec.parse(json);

      expect(decoded.length).toBe(3);
      expect(decoded[0] instanceof Color).toBe(true);
      expect(decoded[1] instanceof Color).toBe(true);
      expect(decoded[2] instanceof Color).toBe(true);
      expect(decoded[0].r).toBe(255);
      expect(decoded[1].g).toBe(255);
      expect(decoded[2].b).toBe(255);
    });

    test("handles deeply nested mixed objects", () => {
      const complexObj = {
        shapes: [new Shape(1, 1), new Shape(2, 2)],
        drawing: new Drawing(new Shape(5, 5), new Color(255, 0, 0)),
        metadata: {
          colors: [new Color(0, 255, 0)],
          settings: {
            defaultShape: new Shape(0, 0),
          },
        },
      };

      const json = codec.stringify(complexObj);
      const decoded = codec.parse(json);

      expect(decoded.shapes[0] instanceof Shape).toBe(true);
      expect(decoded.drawing instanceof Drawing).toBe(true);
      expect(decoded.drawing.shape instanceof Shape).toBe(true);
      expect(decoded.metadata.colors[0] instanceof Color).toBe(true);
      expect(decoded.metadata.settings.defaultShape instanceof Shape).toBe(
        true,
      );
    });

    test("handles inheritance correctly", () => {
      class Circle extends Shape {
        constructor(x, y, radius) {
          super(x, y);
          this.radius = radius;
        }
      }
      JSONCodec.withJSON(Circle);
      codec.register(Circle);

      const circle = new Circle(10, 20, 5);
      const json = codec.stringify(circle);
      const decoded = codec.parse(json);

      expect(decoded instanceof Circle).toBe(true);
      expect(decoded instanceof Shape).toBe(true);
      expect(decoded.x).toBe(10);
      expect(decoded.y).toBe(20);
      expect(decoded.radius).toBe(5);
    });
  });

  describe("Edge Cases", () => {
    test("handles null and undefined fields", () => {
      const shape = new Shape(null, undefined);
      const json = codec.stringify(shape);
      const decoded = codec.parse(json);

      expect(decoded instanceof Shape).toBe(true);
      expect(decoded.x).toBeNull();
      // y exists but is undefined since it was explicitly assigned in constructor
      expect(decoded.y).toBeUndefined();
      expect("y" in decoded).toBe(true);
    });

    test("handles empty objects", () => {
      class Empty {}
      JSONCodec.withJSON(Empty);
      codec.register(Empty);

      const empty = new Empty();
      const json = codec.stringify(empty);
      const decoded = codec.parse(json);

      expect(decoded instanceof Empty).toBe(true);
      expect(Object.keys(decoded)).toHaveLength(0);
    });
  });

  describe("Custom toJSON Behavior", () => {
    test("respects custom toJSON implementations", () => {
      class CustomJSON {
        constructor(data) {
          this.data = data;
        }

        toJSON() {
          return {
            _type: this.constructor.name,
            serializedData: `<${this.data}>`, // Custom format
          };
        }
      }
      codec.register(CustomJSON);

      const obj = new CustomJSON("test");
      const json = codec.stringify(obj);
      const decoded = codec.parse(json);

      expect(decoded instanceof CustomJSON).toBe(true);
      expect(decoded.serializedData).toBe("<test>");
    });

    test("handles custom toJSON with nested instances", () => {
      class Container {
        constructor(color) {
          this.color = color;
        }

        toJSON() {
          return {
            _type: this.constructor.name,
            wrappedColor: this.color, // Color should still be handled normally
          };
        }
      }
      codec.register(Container);

      const container = new Container(new Color(255, 0, 0));
      const json = codec.stringify(container);
      const decoded = codec.parse(json);

      expect(decoded instanceof Container).toBe(true);
      expect(decoded.wrappedColor instanceof Color).toBe(true);
      expect(decoded.wrappedColor.r).toBe(255);
    });
  });
});
