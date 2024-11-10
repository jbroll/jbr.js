# JSONCodec

A lightweight mixin for adding JSON serialization to JavaScript classes with automatic type preservation.

## Overview

JSONCodec allows you to serialize class instances to JSON and deserialize them back to their original class types. It uses a simple mixin pattern and preserves JavaScript's native JSON behavior.

## Installation

```javascript
import { JSONCodec } from "./JSONCodec.js";
```

## Basic Usage

1. Create a codec instance:

```javascript
const codec = new JSONCodec();
```

2. Add JSON serialization to your class:

```javascript
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}
JSONCodec.withJSON(Point);
```

3. Register your class with the codec:

```javascript
codec.register(Point);
```

4. Use the codec to serialize and deserialize:

```javascript
const point = new Point(10, 20);
const json = codec.stringify(point);
const decoded = codec.parse(json);
// decoded instanceof Point === true
// decoded.x === 10, decoded.y === 20
```

## API Reference

### `class JSONCodec`

#### Constructor

- `new JSONCodec()` - Creates a new codec instance for registering classes

#### Static Methods

- `JSONCodec.withJSON(targetClass)` - Adds JSON serialization capabilities to a class
  - Returns the modified class for chaining
  - Adds a `toJSON()` method to the class prototype

#### Instance Methods

- `register(class)` - Registers a class with the codec for type-aware deserialization
  - Returns the codec instance for chaining
- `stringify(value[, replacer[, space]])` - Serializes a value to JSON string
  - Same parameters as `JSON.stringify()`
- `parse(text[, reviver])` - Parses JSON string back to objects with preserved types
  - Same parameters as `JSON.parse()`

## Features

### Type Preservation

Objects are serialized with a `_type` field that allows reconstruction of the original class instance:

```javascript
class Color {
  constructor(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
  }
}
JSONCodec.withJSON(Color);
codec.register(Color);

const color = new Color(255, 0, 0);
const json = codec.stringify(color);
// json = {"_type":"Color","r":255,"g":0,"b":0}
const decoded = codec.parse(json);
// decoded instanceof Color === true
```

### Nested Objects

Handles nested class instances automatically:

```javascript
class Drawing {
  constructor(color) {
    this.color = color;
    this.name = "My Drawing";
  }
}
JSONCodec.withJSON(Drawing);
codec.register(Drawing);

const drawing = new Drawing(new Color(255, 0, 0));
const json = codec.stringify(drawing);
const decoded = codec.parse(json);
// decoded.color instanceof Color === true
```

### Arrays

Works with arrays of class instances:

```javascript
const colors = [new Color(255, 0, 0), new Color(0, 255, 0)];
const json = codec.stringify(colors);
const decoded = codec.parse(json);
// decoded[0] instanceof Color === true
// decoded[1] instanceof Color === true
```

### Null and Undefined Handling

Follows JavaScript's native JSON behavior:

- `null` values are preserved
- Properties assigned `undefined` in constructors are preserved with `undefined` values
- Never-assigned properties are not included in the serialized output

```javascript
class Shape {
  constructor(x, y) {
    this.x = x;
    this.y = y; // even undefined values are preserved if explicitly assigned
  }
}
JSONCodec.withJSON(Shape);
codec.register(Shape);

const shape = new Shape(null, undefined);
const json = codec.stringify(shape);
const decoded = codec.parse(json);
// decoded.x === null
// decoded.y === undefined
// 'y' in decoded === true
```

### Custom JSON Behavior

Classes can provide their own `toJSON()` method for custom serialization:

```javascript
class CustomShape {
  constructor(points) {
    this.points = points;
  }

  toJSON() {
    return {
      _type: this.constructor.name,
      serializedPoints: this.points.join(","),
    };
  }
}
codec.register(CustomShape);

const shape = new CustomShape([1, 2, 3]);
const json = codec.stringify(shape);
// json = {"_type":"CustomShape","serializedPoints":"1,2,3"}
```

### Inheritance

Works with class inheritance hierarchies:

```javascript
class Shape {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}
JSONCodec.withJSON(Shape);

class Circle extends Shape {
  constructor(x, y, radius) {
    super(x, y);
    this.radius = radius;
  }
}
JSONCodec.withJSON(Circle);

codec.register(Shape).register(Circle);

const circle = new Circle(10, 20, 5);
const json = codec.stringify(circle);
const decoded = codec.parse(json);
// decoded instanceof Circle === true
// decoded instanceof Shape === true
```

## Best Practices

1. Always register classes before attempting to parse JSON containing their instances
2. Apply `withJSON()` to base classes before derived classes
3. Register both base and derived classes with the codec if using inheritance
4. Let native JSON handle null/undefined values rather than trying to manage them manually

## Limitations

1. Cannot preserve non-enumerable properties unless explicitly handled in a custom `toJSON()`
2. Circular references will throw an error (native JSON limitation)
3. Constructor parameters are not preserved - objects are reconstructed using property assignment
4. Function properties are not preserved (native JSON limitation)

## Error Handling

The codec throws errors in these cases:

- Attempting to parse JSON with an unregistered class type
- Circular references in the object graph
- Invalid JSON syntax

```javascript
// Unregistered class
class Unregistered {}
JSONCodec.withJSON(Unregistered);
const instance = new Unregistered();
const json = codec.stringify(instance);
try {
  codec.parse(json); // throws Error
} catch (e) {
  // Error: Unknown type "Unregistered" in codec. Did you forget to register the class?
}

// Circular reference
const obj = { a: 1 };
obj.self = obj;
try {
  codec.stringify(obj); // throws Error
} catch (e) {
  // Error: Converting circular structure to JSON
}
```

## TypeScript Support

While this documentation shows JavaScript examples, the codec works equally well with TypeScript classes. Type definitions are included in the source.

Would you like me to expand on any part of this documentation or add additional examples?
