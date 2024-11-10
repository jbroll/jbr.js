# JSONCodec

A flexible JSON codec system that enables class-aware serialization and deserialization with support for delegation and property-specific handling.

## Features

- Class-aware serialization and deserialization
- Property-specific codec delegation
- Class-specific codec delegation
- Circular reference detection
- Support for custom replacers and revivers
- Chainable configuration API

## Basic Usage

### Simple Class Serialization

```javascript
import { JSONCodec } from "jbr.js";

// Create a codec instance
const codec = new JSONCodec();

// Define and register a class
class Point extends JSONCodec.Codec(codec).register() {
  constructor(x, y) {
    super();
    this.x = x;
    this.y = y;
  }
}

// Use it
const point = new Point(10, 20);
const json = codec.stringify(point);
// Result: {"_type":"Point","x":10,"y":20}

const restored = codec.parse(json);
// Result: Point instance with x=10, y=20
```

### Delegation

The codec system supports both property-specific and class-specific delegation to other codecs:

```javascript
// Create separate codecs for different concerns
const mainCodec = new JSONCodec();
const shapeCodec = new JSONCodec();
const colorCodec = new JSONCodec();

// Define classes with delegation
class Shape extends JSONCodec.Codec(shapeCodec).register() {
  constructor(type, size) {
    super();
    this.type = type;
    this.size = size;
  }
}

class Color extends JSONCodec.Codec(colorCodec).register() {
  constructor(name, hex) {
    super();
    this.name = name;
    this.hex = hex;
  }
}

class Drawing extends JSONCodec.Codec(mainCodec)
  .delegatesTo(Shape, shapeCodec)
  .delegatesTo(Color, colorCodec)
  .delegateProp("specialColor", colorCodec)
  .register() {
  constructor(shape, color, specialColor) {
    super();
    this.shape = shape;
    this.color = color;
    this.specialColor = specialColor;
  }
}
```

## Advanced Features

### Multiple Codec Registration

A class can be registered with multiple codecs:

```javascript
class MultiRegistered extends JSONCodec.Codec([codec1, codec2]).register() {
  // class implementation
}
```

### Custom Replacers and Revivers

The codec supports JSON.stringify's replacer and reviver functions:

```javascript
const json = codec.stringify(
  obj,
  (key, value) => {
    if (key === "sensitive") return undefined;
    return value;
  },
  2,
);

const obj = codec.parse(json, (key, value) => {
  if (key === "date") return new Date(value);
  return value;
});
```

## Error Handling

The codec includes built-in error handling for:

- Circular references (`TypeError`)
- Unknown types during parsing (`Error`)
- Invalid codec implementations (`Error`)

Example error handling:

```javascript
try {
  const obj = { circular: null };
  obj.circular = obj;
  const json = codec.stringify(obj);
} catch (error) {
  if (error instanceof TypeError) {
    console.error("Circular reference detected");
  }
}
```

## Best Practices

1. **Register Early**: Register all classes with their respective codecs before any serialization/deserialization operations.

2. **Delegation Strategy**: Use property delegation for fine-grained control and class delegation for broader type handling.

3. **Error Handling**: Always wrap codec operations in try-catch blocks to handle potential circular references or unknown types.

4. **Class Hierarchy**: When using delegation with class hierarchies, register base classes before derived classes.

## API Reference

For complete API documentation, see the [API Reference](api.md#jsoncodec).
