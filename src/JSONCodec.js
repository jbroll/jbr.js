export class JSONCodec {
  constructor() {
    this.classMap = new Map();
  }

  static Codec(codecs) {
    const validateCodec = codec => {
      if (!codec?.stringify || !codec?.parse || !codec?.register) {
        throw new Error('Invalid codec: must implement stringify, parse, and register');
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
  
        // Set codec for every property, using default if not explicitly
        // specified
        for (const propName of Object.getOwnPropertyNames(this.prototype)) {
          if (!this.propertyCodecs.has(propName)) {
            const value = this.prototype[propName];
            if (value && typeof value === 'object') {
              const cls = value.constructor;
              
              if (this.classCodecs.has(cls)) {
                // Use explicitly delegated codec for this class
                this.propertyCodecs.set(propName, this.classCodecs.get(cls));
              } else if (cls.codecs?.length === 1) {
                // Auto-delegate to single codec
                this.propertyCodecs.set(propName, cls.codecs[0]);
              } else if (cls.codecs?.length > 1) {
                throw new Error(`Property ${propName} has multiple possible codecs. Must specify using delegatesTo(${cls.name}, codec).`);
              } else {
                this.propertyCodecs.set(propName, defaultCodec);
              }
            } else {
              this.propertyCodecs.set(propName, defaultCodec);
            }
          }
        }
  
        codecArray.forEach(codec => codec.register(this));
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
      if (key === '_type') return value;

      if (seen.has(value)) {
        throw new TypeError('Converting circular structure to JSON');
      }
      if (value !== null && typeof value === 'object') {
        seen.add(value);
      }
      
      const targetCodec = currentClass?.propertyCodecs.get(key);
      if (targetCodec !== this && value !== null && typeof value === 'object') {
        const subJson = targetCodec.stringify(value);
        return JSON.parse(subJson);
      }

      if (value !== null && typeof value === 'object' && this.classMap.has(value.constructor.name)) {
        return Object.assign({}, value, { _type: value.constructor.name });
      }
      
      return replacer ? replacer(key, value) : value;
    };

    return JSON.stringify(obj, function(key, value) {
      return processValue(value, key, this?.constructor);
    }, space);
  }

  parse(text, reviver) {
    return JSON.parse(text, (key, value) => {
      if (value !== null && typeof value === 'object') {
        const typeName = value._type;
        if (typeName) {
          if (!this.classMap.has(typeName)) {
            throw new Error(`Unknown type "${typeName}" in codec. Did you forget to register the class?`);
          }
          const cls = this.classMap.get(typeName);
          const instance = Object.create(cls.prototype);
          const { _type, ...props } = value;
          Object.assign(instance, props);
          value = instance;
        }
      }
      return reviver ? reviver(key, value) : value;
    });
  }
}

