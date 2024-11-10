<a name="module_JSONCodec"></a>

## JSONCodec

<p>A flexible JSON codec system that enables class-aware serialization
and deserialization with support for delegation and property-specific handling.</p>

- [JSONCodec](#module_JSONCodec)
  - [.JSONCodec](#module_JSONCodec.JSONCodec)
    - [new exports.JSONCodec()](#new_module_JSONCodec.JSONCodec_new)
    - _instance_
      - [.classMap](#module_JSONCodec.JSONCodec+classMap) : <code>Map.&lt;string, function()&gt;</code>
      - [.register(cls)](#module_JSONCodec.JSONCodec+register) ⇒ <code>JSONCodec</code>
      - [.stringify(obj, [replacer], [space])](#module_JSONCodec.JSONCodec+stringify) ⇒ <code>string</code>
      - [.parse(text, [reviver])](#module_JSONCodec.JSONCodec+parse) ⇒ <code>\*</code>
    - _static_
      - [.Codec(codecs)](#module_JSONCodec.JSONCodec.Codec) ⇒ <code>Class</code>
  - [.delegateProp(propName, targetCodec)](#module_JSONCodec.delegateProp) ⇒ <code>Class</code>
  - [.delegatesTo(cls, targetCodec)](#module_JSONCodec.delegatesTo) ⇒ <code>Class</code>
  - [.register()](#module_JSONCodec.register) ⇒ <code>Class</code>

<a name="module_JSONCodec.JSONCodec"></a>

### JSONCodec.JSONCodec

<p>A codec implementation for JSON serialization and deserialization with class type preservation.
Supports delegation to other codecs for specific classes or properties.</p>

**Kind**: static class of [<code>JSONCodec</code>](#module_JSONCodec)

- [.JSONCodec](#module_JSONCodec.JSONCodec)
  - [new exports.JSONCodec()](#new_module_JSONCodec.JSONCodec_new)
  - _instance_
    - [.classMap](#module_JSONCodec.JSONCodec+classMap) : <code>Map.&lt;string, function()&gt;</code>
    - [.register(cls)](#module_JSONCodec.JSONCodec+register) ⇒ <code>JSONCodec</code>
    - [.stringify(obj, [replacer], [space])](#module_JSONCodec.JSONCodec+stringify) ⇒ <code>string</code>
    - [.parse(text, [reviver])](#module_JSONCodec.JSONCodec+parse) ⇒ <code>\*</code>
  - _static_
    - [.Codec(codecs)](#module_JSONCodec.JSONCodec.Codec) ⇒ <code>Class</code>

<a name="new_module_JSONCodec.JSONCodec_new"></a>

#### new exports.JSONCodec()

<p>Creates a new JSONCodec instance.</p>

<a name="module_JSONCodec.JSONCodec+classMap"></a>

#### jsonCodec.classMap : <code>Map.&lt;string, function()&gt;</code>

**Kind**: instance property of [<code>JSONCodec</code>](#module_JSONCodec.JSONCodec)  
<a name="module_JSONCodec.JSONCodec+register"></a>

#### jsonCodec.register(cls) ⇒ <code>JSONCodec</code>

<p>Registers a class with this codec for type-aware serialization.</p>

**Kind**: instance method of [<code>JSONCodec</code>](#module_JSONCodec.JSONCodec)  
**Returns**: <code>JSONCodec</code> - <p>The codec instance for chaining</p>

| Param | Type                  | Description                  |
| ----- | --------------------- | ---------------------------- |
| cls   | <code>function</code> | <p>The class to register</p> |

**Example**

```js
const codec = new JSONCodec();
codec.register(MyClass);
```

<a name="module_JSONCodec.JSONCodec+stringify"></a>

#### jsonCodec.stringify(obj, [replacer], [space]) ⇒ <code>string</code>

<p>Serializes an object to a JSON string, preserving class types and handling delegated properties.</p>

**Kind**: instance method of [<code>JSONCodec</code>](#module_JSONCodec.JSONCodec)  
**Returns**: <code>string</code> - <p>The JSON string representation</p>  
**Throws**:

- <code>TypeError</code> <p>If circular references are detected</p>

| Param      | Type                                       | Description                                                               |
| ---------- | ------------------------------------------ | ------------------------------------------------------------------------- |
| obj        | <code>\*</code>                            | <p>The object to stringify</p>                                            |
| [replacer] | <code>function</code>                      | <p>A function that alters the behavior of the stringification process</p> |
| [space]    | <code>number</code> \| <code>string</code> | <p>The number of spaces to use for indentation</p>                        |

**Example**

```js
const codec = new JSONCodec();
const shape = new Shape(10, 20);
const json = codec.stringify(shape);
// Result: {"_type":"Shape","x":10,"y":20}
```

<a name="module_JSONCodec.JSONCodec+parse"></a>

#### jsonCodec.parse(text, [reviver]) ⇒ <code>\*</code>

<p>Parses a JSON string, reconstructing class instances and handling delegated properties.</p>

**Kind**: instance method of [<code>JSONCodec</code>](#module_JSONCodec.JSONCodec)  
**Returns**: <code>\*</code> - <p>The parsed value with reconstructed class instances</p>  
**Throws**:

- <code>Error</code> <p>If an unknown type is encountered</p>

| Param     | Type                  | Description                                   |
| --------- | --------------------- | --------------------------------------------- |
| text      | <code>string</code>   | <p>The JSON string to parse</p>               |
| [reviver] | <code>function</code> | <p>A function that transforms the results</p> |

**Example**

```js
const codec = new JSONCodec();
const json = '{"_type":"Shape","x":10,"y":20}';
const shape = codec.parse(json);
// Result: Shape instance with x=10, y=20
```

<a name="module_JSONCodec.JSONCodec.Codec"></a>

#### JSONCodec.Codec(codecs) ⇒ <code>Class</code>

<p>Creates a base class that is aware of codecs and can be registered with them.</p>

**Kind**: static method of [<code>JSONCodec</code>](#module_JSONCodec.JSONCodec)  
**Returns**: <code>Class</code> - <p>A class with codec awareness capabilities</p>  
**Throws**:

- <code>Error</code> <p>If any codec doesn't implement required methods</p>

| Param  | Type                                                           | Description                                             |
| ------ | -------------------------------------------------------------- | ------------------------------------------------------- |
| codecs | <code>JSONCodec</code> \| <code>Array.&lt;JSONCodec&gt;</code> | <p>Single codec or array of codecs to register with</p> |

**Example**

```js
// Register with a single codec
class Shape extends JSONCodec.Codec(shapeCodec).register() {
  constructor(x, y) {
    super();
    this.x = x;
    this.y = y;
  }
}
```

**Example**

```js
// Register with delegation
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

<a name="module_JSONCodec.delegateProp"></a>

### JSONCodec.delegateProp(propName, targetCodec) ⇒ <code>Class</code>

<p>Delegates a property to a specific codec</p>

**Kind**: static method of [<code>JSONCodec</code>](#module_JSONCodec)  
**Returns**: <code>Class</code> - <p>The class for chaining</p>

| Param       | Type                   | Description                             |
| ----------- | ---------------------- | --------------------------------------- |
| propName    | <code>string</code>    | <p>The property name to delegate</p>    |
| targetCodec | <code>JSONCodec</code> | <p>The codec to handle the property</p> |

<a name="module_JSONCodec.delegatesTo"></a>

### JSONCodec.delegatesTo(cls, targetCodec) ⇒ <code>Class</code>

<p>Delegates a class to a specific codec</p>

**Kind**: static method of [<code>JSONCodec</code>](#module_JSONCodec)  
**Returns**: <code>Class</code> - <p>The class for chaining</p>

| Param       | Type                   | Description                          |
| ----------- | ---------------------- | ------------------------------------ |
| cls         | <code>function</code>  | <p>The class to delegate</p>         |
| targetCodec | <code>JSONCodec</code> | <p>The codec to handle the class</p> |

<a name="module_JSONCodec.register"></a>

### JSONCodec.register() ⇒ <code>Class</code>

<p>Registers this class with all its codecs</p>

**Kind**: static method of [<code>JSONCodec</code>](#module_JSONCodec)  
**Returns**: <code>Class</code> - <p>The registered class</p>
