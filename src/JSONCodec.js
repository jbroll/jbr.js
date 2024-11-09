export class JSONCodec {
  constructor() {
    this.classMap = new Map();
  }

  static Codec(codecs) {
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
      static codecs = codecArray;
      static propertyCodecs = new Map();
      static classCodecs = new Map();

      static delegateProp(propName, targetCodec) {
        this.propertyCodecs.set(propName, targetCodec);
        return this;
      }

      static delegatesTo(cls, targetCodec) {
        this.classCodecs.set(cls, targetCodec);
        return this;
      }

      static register() {
        const defaultCodec = codecArray[0];

        // Analyze prototype properties for codec delegation
        for (const propName of Object.getOwnPropertyNames(this.prototype)) {
          if (!this.propertyCodecs.has(propName)) {
            const descriptor = Object.getOwnPropertyDescriptor(
              this.prototype,
              propName,
            );
            if (descriptor.value && typeof descriptor.value === "object") {
              const cls = descriptor.value.constructor;

              if (this.classCodecs.has(cls)) {
                this.propertyCodecs.set(propName, this.classCodecs.get(cls));
              } else if (cls.codecs?.length === 1) {
                this.propertyCodecs.set(propName, cls.codecs[0]);
              } else if (cls.codecs?.length > 1) {
                throw new Error(
                  `Property ${propName} has multiple possible codecs. Must specify using delegatesTo(${cls.name}, codec).`,
                );
              } else {
                this.propertyCodecs.set(propName, defaultCodec);
              }
            }
          }
        }

        // Register with all codecs
        codecArray.forEach((codec) => codec.register(this));
        return this;
      }
    };
  }

  register(cls) {
    this.classMap.set(cls.name, cls);
    return this;
  }

  stringify(obj, replacer, space, seen = new WeakSet()) {
    const processValue = (value, key, currentClass) => {
      if (key === "_type") return value;

      // Handle circular references
      if (value !== null && typeof value === "object") {
        if (seen.has(value)) {
          throw new TypeError("Converting circular structure to JSON");
        }
        seen.add(value);
      }

      // Handle delegation
      if (
        currentClass?.propertyCodecs?.has(key) &&
        value !== null &&
        typeof value === "object"
      ) {
        const targetCodec = currentClass.propertyCodecs.get(key);
        if (targetCodec !== this) {
          const subJson = targetCodec.stringify(value);
          return JSON.parse(subJson);
        }
      }

      // Handle class instances
      if (value !== null && typeof value === "object") {
        const constructor = value.constructor;
        if (
          constructor &&
          constructor.name &&
          this.classMap.has(constructor.name)
        ) {
          return {
            _type: constructor.name,
            ...value,
          };
        }
      }

      return replacer ? replacer(key, value) : value;
    };

    return JSON.stringify(
      obj,
      function (key, value) {
        return processValue(value, key, this?.constructor);
      },
      space,
    );
  }

  parse(text, reviver) {
    return JSON.parse(text, (key, value) => {
      if (value !== null && typeof value === "object") {
        const typeName = value._type;
        if (typeName) {
          if (!this.classMap.has(typeName)) {
            throw new Error(
              `Unknown type "${typeName}" in codec. Did you forget to register the class?`,
            );
          }
          const cls = this.classMap.get(typeName);
          const instance = Object.create(cls.prototype);
          const { _type, ...props } = value;

          // Recursively parse nested objects
          for (const [key, val] of Object.entries(props)) {
            if (val && typeof val === "object" && val._type) {
              props[key] = this.parse(JSON.stringify(val));
            }
          }

          Object.assign(instance, props);
          return instance;
        }
      }
      return reviver ? reviver(key, value) : value;
    });
  }
}
