<a name="module_JSONCodec"></a>

## JSONCodec

- [JSONCodec](#module_JSONCodec)
  - [~JSONCodec](#module_JSONCodec..JSONCodec)
    - [new JSONCodec()](#new_module_JSONCodec..JSONCodec_new)
    - _instance_
      - [.register(cls)](#module_JSONCodec..JSONCodec+register) ⇒ <code>JSONCodec</code>
      - [.stringify(obj, [replacer], [space])](#module_JSONCodec..JSONCodec+stringify) ⇒ <code>string</code>
      - [.parse(text, [reviver])](#module_JSONCodec..JSONCodec+parse) ⇒ <code>\*</code>
    - _static_
      - [.withJSON(targetClass)](#module_JSONCodec..JSONCodec.withJSON) ⇒ <code>function</code>

<a name="module_JSONCodec..JSONCodec"></a>

### JSONCodec~JSONCodec

<p>A codec for serializing and deserializing JSON with class type information.
Allows for automatic reconstruction of class instances from JSON data.</p>

**Kind**: inner class of [<code>JSONCodec</code>](#module_JSONCodec)

- [~JSONCodec](#module_JSONCodec..JSONCodec)
  - [new JSONCodec()](#new_module_JSONCodec..JSONCodec_new)
  - _instance_
    - [.register(cls)](#module_JSONCodec..JSONCodec+register) ⇒ <code>JSONCodec</code>
    - [.stringify(obj, [replacer], [space])](#module_JSONCodec..JSONCodec+stringify) ⇒ <code>string</code>
    - [.parse(text, [reviver])](#module_JSONCodec..JSONCodec+parse) ⇒ <code>\*</code>
  - _static_
    - [.withJSON(targetClass)](#module_JSONCodec..JSONCodec.withJSON) ⇒ <code>function</code>

<a name="new_module_JSONCodec..JSONCodec_new"></a>

#### new JSONCodec()

<p>Creates a new JSONCodec instance.
Initializes an empty map for storing class constructors.</p>

<a name="module_JSONCodec..JSONCodec+register"></a>

#### jsonCodec.register(cls) ⇒ <code>JSONCodec</code>

<p>Registers a class with the codec for later deserialization.</p>

**Kind**: instance method of [<code>JSONCodec</code>](#module_JSONCodec..JSONCodec)  
**Returns**: <code>JSONCodec</code> - <p>The codec instance for chaining</p>  
**Throws**:

- <code>Error</code> <p>If cls is not a constructor function</p>

| Param | Type                  | Description                              |
| ----- | --------------------- | ---------------------------------------- |
| cls   | <code>function</code> | <p>The class constructor to register</p> |

**Example**

```js
const codec = new JSONCodec().register(Person).register(Address);
```

<a name="module_JSONCodec..JSONCodec+stringify"></a>

#### jsonCodec.stringify(obj, [replacer], [space]) ⇒ <code>string</code>

<p>Serializes an object to a JSON string.
This is a wrapper around JSON.stringify that preserves type information.</p>

**Kind**: instance method of [<code>JSONCodec</code>](#module_JSONCodec..JSONCodec)  
**Returns**: <code>string</code> - <p>The JSON string representation of the object</p>

| Param      | Type                                                                 | Default       | Description                                                              |
| ---------- | -------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------ |
| obj        | <code>\*</code>                                                      |               | <p>The value to convert to JSON</p>                                      |
| [replacer] | <code>function</code> \| <code>Array.&lt;(string\|number)&gt;</code> | <code></code> | <p>Array of strings/numbers or function to transform values</p>          |
| [space]    | <code>number</code> \| <code>string</code>                           |               | <p>Number of spaces for indentation or string to use for indentation</p> |

**Example**

```js
const json = codec.stringify(new Person("John"));
```

<a name="module_JSONCodec..JSONCodec+parse"></a>

#### jsonCodec.parse(text, [reviver]) ⇒ <code>\*</code>

<p>Parses a JSON string and reconstructs class instances.
Objects with a _type property will be converted to instances of the corresponding registered class.</p>

**Kind**: instance method of [<code>JSONCodec</code>](#module_JSONCodec..JSONCodec)  
**Returns**: <code>\*</code> - <p>The parsed value with reconstructed class instances</p>  
**Throws**:

- <code>Error</code> <p>If an object has a \_type that hasn't been registered with the codec</p>

| Param     | Type                  | Default       | Description                                |
| --------- | --------------------- | ------------- | ------------------------------------------ |
| text      | <code>string</code>   |               | <p>The JSON string to parse</p>            |
| [reviver] | <code>function</code> | <code></code> | <p>Function to transform parsed values</p> |

**Example**

```js
const person = codec.parse('{"name":"John","_type":"Person"}');
// person instanceof Person === true
```

<a name="module_JSONCodec..JSONCodec.withJSON"></a>

#### JSONCodec.withJSON(targetClass) ⇒ <code>function</code>

<p>Class decorator that adds a toJSON method to the target class.
The toJSON method will include the class name in the serialized output.</p>

**Kind**: static method of [<code>JSONCodec</code>](#module_JSONCodec..JSONCodec)  
**Returns**: <code>function</code> - <p>The decorated class</p>

| Param       | Type                  | Description                  |
| ----------- | --------------------- | ---------------------------- |
| targetClass | <code>function</code> | <p>The class to decorate</p> |

**Example**

```js
＠JSONCodec.withJSON
class Person {
  constructor(name) {
    this.name = name;
  }
}
```
