/**
 * @module JSONCodec
 */

/**
 * A codec for serializing and deserializing JSON with class type information.
 * Allows for automatic reconstruction of class instances from JSON data.
 */
class JSONCodec {
  /**
   * Creates a new JSONCodec instance.
   * Initializes an empty map for storing class constructors.
   * @constructor
   */
  constructor() {
    /**
     * Map storing class constructors keyed by class name
     * @type {Map<string, Function>}
     * @private
     */
    this.classMap = new Map();
  }

  /**
   * Class decorator that adds a toJSON method to the target class.
   * The toJSON method will include the class name in the serialized output.
   *
   * @static
   * @param {Function} targetClass - The class to decorate
   * @returns {Function} The decorated class
   *
   * @example
   * ```js
   * ＠JSONCodec.withJSON
   * class Person {
   *   constructor(name) {
   *     this.name = name;
   *   }
   * }
   * ```
   */
  static withJSON(targetClass) {
    return Object.assign(targetClass.prototype, {
      toJSON() {
        return {
          ...this,
          _type: this.constructor.name,
        };
      },
    });
  }

  /**
   * Registers a class with the codec for later deserialization.
   *
   * @param {Function} cls - The class constructor to register
   * @returns {JSONCodec} The codec instance for chaining
   * @throws {Error} If cls is not a constructor function
   *
   * @example
   * ```js
   * const codec = new JSONCodec()
   *   .register(Person)
   *   .register(Address);
   * ```
   */
  register(cls) {
    this.classMap.set(cls.name, cls);
    return this;
  }

  /**
   * Serializes an object to a JSON string.
   * This is a wrapper around JSON.stringify that preserves type information.
   *
   * @param {*} obj - The value to convert to JSON
   * @param {Function|Array<string|number>} [replacer=null] - Array of strings/numbers or function to transform values
   * @param {number|string} [space] - Number of spaces for indentation or string to use for indentation
   * @returns {string} The JSON string representation of the object
   *
   * @example
   * ```js
   * const json = codec.stringify(new Person('John'));
   * ```
   */
  stringify(obj, replacer, space) {
    return JSON.stringify(obj, replacer, space);
  }

  /**
   * Parses a JSON string and reconstructs class instances.
   * Objects with a _type property will be converted to instances of the corresponding registered class.
   *
   * @param {string} text - The JSON string to parse
   * @param {Function} [reviver=null] - Function to transform parsed values
   * @returns {*} The parsed value with reconstructed class instances
   * @throws {Error} If an object has a _type that hasn't been registered with the codec
   *
   * @example
   * ```js
   * const person = codec.parse('{"name":"John","_type":"Person"}');
   * // person instanceof Person === true
   * ```
   */
  parse(text, reviver) {
    /**
     * Internal helper to parse individual values and reconstruct class instances.
     *
     * @param {*} value - The value to parse
     * @returns {*} The parsed value, possibly reconstructed as a class instance
     * @private
     */
    const parseValue = (value) => {
      if (value && typeof value === "object" && value._type) {
        const cls = this.classMap.get(value._type);
        if (!cls) {
          throw new Error(
            `Unknown type "${value._type}" in codec. Did you forget to register the class?`,
          );
        }
        const { _type, ...props } = value;
        return new cls(props);
      }
      return value;
    };

    return JSON.parse(text, (key, value) => {
      const parsed = parseValue(value);
      return reviver ? reviver(key, parsed) : parsed;
    });
  }
}

export { JSONCodec };
