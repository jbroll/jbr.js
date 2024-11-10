/**
 * @fileoverview A flexible JSON codec system that enables class-aware serialization
 * and deserialization with support for delegation and property-specific handling.
 * @module JSONCodec
 */

/**
 * A codec implementation for JSON serialization and deserialization with class type preservation.
 * Supports delegation to other codecs for specific classes or properties.
 */
export class JSONCodec {
  /**
   * Creates a new JSONCodec instance.
   * @constructor
   */
  constructor() {
    /** @type {Map<string, Function>} */
    this.classMap = new Map();
  }

  /**
   * Creates a base class that is aware of codecs and can be registered with them.
   * @static
   * @param {JSONCodec|JSONCodec[]} codecs - Single codec or array of codecs to register with
   * @returns {Class} A class with codec awareness capabilities
   * @throws {Error} If any codec doesn't implement required methods
   *
   * @example
   * // Register with a single codec
   * class Shape extends JSONCodec.Codec(shapeCodec).register() {
   *   constructor(x, y) {
   *     super();
   *     this.x = x;
   *     this.y = y;
   *   }
   * }
   *
   * @example
   * // Register with delegation
   * class Drawing extends JSONCodec.Codec(mainCodec)
   *   .delegatesTo(Shape, shapeCodec)
   *   .delegatesTo(Color, colorCodec)
   *   .delegateProp("specialColor", colorCodec)
   *   .register() {
   *   constructor(shape, color, specialColor) {
   *     super();
   *     this.shape = shape;
   *     this.color = color;
   *     this.specialColor = specialColor;
   *   }
   * }
   */
  static Codec(codecs) {
    /**
     * Validates that a codec implements all required methods
     * @private
     * @param {JSONCodec} codec - The codec to validate
     * @throws {Error} If codec is missing required methods
     */
    const validateCodec = (codec) => {
      if (!codec?.stringify || !codec?.parse || !codec?.register) {
        throw new Error(
          "Invalid codec: must implement stringify, parse, and register",
        );
      }
    };

    const codecArray = Array.isArray(codecs) ? codecs : [codecs];
    codecArray.forEach(validateCodec);

    return class {
      /** @type {JSONCodec[]} */
      static codecs = codecArray;

      /** @type {Map<string, JSONCodec>} */
      static propertyCodecs = new Map();

      /** @type {Map<Function, JSONCodec>} */
      static classCodecs = new Map();

      /**
       * Delegates a property to a specific codec
       * @param {string} propName - The property name to delegate
       * @param {JSONCodec} targetCodec - The codec to handle the property
       * @returns {Class} The class for chaining
       */
      static delegateProp(propName, targetCodec) {
        this.propertyCodecs.set(propName, targetCodec);
        return this;
      }

      /**
       * Delegates a class to a specific codec
       * @param {Function} cls - The class to delegate
       * @param {JSONCodec} targetCodec - The codec to handle the class
       * @returns {Class} The class for chaining
       */
      static delegatesTo(cls, targetCodec) {
        this.classCodecs.set(cls, targetCodec);
        return this;
      }

      /**
       * Registers this class with all its codecs
       * @returns {Class} The registered class
       */
      static register() {
        this.codecs.forEach((codec) => codec.register(this));
        return this;
      }
    };
  }

  /**
   * Registers a class with this codec for type-aware serialization.
   * @param {Function} cls - The class to register
   * @returns {JSONCodec} The codec instance for chaining
   *
   * @example
   * const codec = new JSONCodec();
   * codec.register(MyClass);
   */
  register(cls) {
    this.classMap.set(cls.name, cls);
    return this;
  }

  /**
   * Serializes an object to a JSON string, preserving class types and handling delegated properties.
   * @param {*} obj - The object to stringify
   * @param {function} [replacer] - A function that alters the behavior of the stringification process
   * @param {number|string} [space] - The number of spaces to use for indentation
   * @returns {string} The JSON string representation
   * @throws {TypeError} If circular references are detected
   *
   * @example
   * const codec = new JSONCodec();
   * const shape = new Shape(10, 20);
   * const json = codec.stringify(shape);
   * // Result: {"_type":"Shape","x":10,"y":20}
   */
  stringify(obj, replacer, space) {
    /** @type {WeakSet} */
    const seen = new WeakSet();

    /**
     * Processes a value for serialization, handling class instances and delegation
     * @private
     * @param {*} value - The value to process
     * @param {string} [key] - The key of the value in its parent object
     * @param {Function} [currentClass] - The class of the parent object
     * @returns {*} The processed value ready for JSON.stringify
     * @throws {TypeError} If a circular reference is detected
     */
    const processValue = (value, key, currentClass) => {
      if (value === null || typeof value !== "object") {
        return value;
      }

      if (seen.has(value)) {
        throw new TypeError("Converting circular structure to JSON");
      }
      seen.add(value);

      if (Array.isArray(value)) {
        return value.map((v) => processValue(v));
      }

      // Handle property delegation first - highest precedence
      if (currentClass?.propertyCodecs?.has(key)) {
        const targetCodec = currentClass.propertyCodecs.get(key);
        return JSON.parse(targetCodec.stringify(value));
      }

      const constructor = Object.getPrototypeOf(value)?.constructor;

      // Handle class delegation
      if (currentClass?.classCodecs?.has(constructor)) {
        const targetCodec = currentClass.classCodecs.get(constructor);
        return JSON.parse(targetCodec.stringify(value));
      }

      // Add _type if this codec handles this class
      const result =
        constructor && this.classMap.has(constructor.name)
          ? { _type: constructor.name }
          : {};

      for (const [k, v] of Object.entries(value)) {
        const processed = processValue(v, k, constructor);
        if (processed !== undefined) {
          result[k] = processed;
        }
      }

      return result;
    };

    let result = processValue(obj);
    if (replacer) {
      result = JSON.parse(JSON.stringify(result, replacer));
    }
    return JSON.stringify(result, null, space);
  }

  /**
   * Parses a JSON string, reconstructing class instances and handling delegated properties.
   * @param {string} text - The JSON string to parse
   * @param {function} [reviver] - A function that transforms the results
   * @returns {*} The parsed value with reconstructed class instances
   * @throws {Error} If an unknown type is encountered
   *
   * @example
   * const codec = new JSONCodec();
   * const json = '{"_type":"Shape","x":10,"y":20}';
   * const shape = codec.parse(json);
   * // Result: Shape instance with x=10, y=20
   */
  parse(text, reviver) {
    /**
     * Processes a parsed value, reconstructing class instances
     * @private
     * @param {*} value - The value to process
     * @param {Function} [parentClass] - The class of the parent object
     * @param {string} [key] - The key of the value in its parent object
     * @returns {*} The processed value with reconstructed class instances
     * @throws {Error} If an unknown type is encountered
     */
    const parseObject = (value, parentClass, key) => {
      if (value === null || typeof value !== "object") {
        return value;
      }

      if (Array.isArray(value)) {
        return value.map((v) => parseObject(v, parentClass));
      }

      // Handle property delegation first
      if (parentClass?.propertyCodecs?.has(key)) {
        const targetCodec = parentClass.propertyCodecs.get(key);
        return targetCodec.parse(JSON.stringify(value));
      }

      if (value._type) {
        // Check if any parent class delegate can handle it
        if (parentClass?.classCodecs) {
          for (const [delegateClass, targetCodec] of parentClass.classCodecs) {
            if (value._type === delegateClass.name) {
              return targetCodec.parse(JSON.stringify(value));
            }
          }
        }

        // If no delegation found, try to handle it ourselves
        const cls = this.classMap.get(value._type);
        if (!cls) {
          throw new Error(
            `Unknown type "${value._type}" in codec. Did you forget to register the class?`,
          );
        }

        const instance = Object.create(cls.prototype);
        const { _type, ...props } = value;

        for (const [k, v] of Object.entries(props)) {
          props[k] = parseObject(v, cls, k);
        }

        Object.assign(instance, props);
        return instance;
      }

      const result = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = parseObject(v, parentClass, k);
      }
      return result;
    };

    const parsed = JSON.parse(text);
    let result = parseObject(parsed);

    if (reviver) {
      const reviverWrapper = function (key, value) {
        return reviver.call(this, key, value);
      };
      result = JSON.parse(JSON.stringify(result), reviverWrapper);
    }

    return result;
  }
}
