const CRLF = "\r\n"

class Decoder {
  constructor() {
    this.commands = {
      PING: this.parsePing,
      ECHO: this.parseEcho,
      SET: this.parseSet,
      GET: this.parseGet,
      DEL: this.parseDel,
    };
  }
  
  parse(input) {
    let parts = input.split("\r\n");

    parts.pop()

    console.log(JSON.stringify(input))

    const attributePatern = /^[$*:].*/

    parts = parts.filter(part => !attributePatern.test(part))
    console.log(parts)

    const command = parts[0].toUpperCase();
    const args = parts.slice(1);
  
    if (this.commands[command]) {
      return this.commands[command](args);
    } else {
      throw new Error(`Unknown command: ${command}`);
    }
  }
  
  parsePing(args) {
    console.log(args)
    if (args.length !== 0) {
      throw new Error('PING command does not take any arguments');
    }
    return { command: 'PING', args: [] };
  }
  
  parseEcho(args) {
    if (args.length !== 1) {
      throw new Error('ECHO command requires exactly one argument');
    }
    return { command: 'ECHO', args: [args[0]] };
  }
  
  parseSet(args) {
    if (args.length < 2) {
      throw new Error('SET command requires at least two arguments');
    }
    return { command: 'SET', args: [args[0], args[1]] };
  }
  
  parseGet(args) {
    if (args.length !== 1) {
      throw new Error('GET command requires exactly one argument');
    }
    return { command: 'GET', args: [args[0]] };
  }
  
  parseDel(args) {
    if (args.length === 0) {
      throw new Error('DEL command requires at least one argument');
    }
    return { command: 'DEL', args: args };
  }

  parseString(str) {
    if (str.startsWith('+')) {
      return str.slice(1, -2);
    }
    throw new Error('Invalid Simple String format');
  }

  parseBulkString(str) {
    if (str.startsWith('$')) {
      const length = parseInt(str.slice(1, str.indexOf('\r\n')), 10);
      if (length === -1) return null; // RESP null bulk string
      return str.slice(str.indexOf('\r\n') + 2, str.indexOf('\r\n') + 2 + length);
    }
    throw new Error('Invalid Bulk String format');
  }

  parseInt(str) {
    if (str.startsWith(':')) {
      return parseInt(str.slice(1, -2), 10);
    }
    throw new Error('Invalid Integer format');
  }

  parseBigInt(str) {
    if (str.startsWith(':')) {
      return BigInt(str.slice(1, -2));
    }
    throw new Error('Invalid BigInt format');
  }

  parseDouble(str) {
    if (str.startsWith(':')) {
      return parseFloat(str.slice(1, -2));
    }
    throw new Error('Invalid Double format');
  }

  parseBool(str) {
    if (str.startsWith('#')) {
      const boolValue = str.slice(1, -2);
      if (boolValue === 't') return true;
      if (boolValue === 'f') return false;
    }
    throw new Error('Invalid Boolean format');
  }

  parseNull(str) {
    if (str === '$_\r\n') {
      return null;
    }
    throw new Error('Invalid Null format');
  }

  parseError(str) {
    if (str.startsWith('-')) {
      return str.slice(1, -2);
    }
    throw new Error('Invalid Error format');
  }

  parseBulkError(str) {
    if (str.startsWith('!')) {
      const length = parseInt(str.slice(1, str.indexOf('\r\n')), 10);
      return str.slice(str.indexOf('\r\n') + 2, str.indexOf('\r\n') + 2 + length);
    }
    throw new Error('Invalid Bulk Error format');
  }

  parseArray(str) {
    if (str.startsWith('*')) {
      const length = parseInt(str.slice(1, str.indexOf('\r\n')), 10);
      let elements = [];
      let rest = str.slice(str.indexOf('\r\n') + 2);
      for (let i = 0; i < length; i++) {
        if (rest.startsWith('$')) {
          let bulkLength = parseInt(rest.slice(1, rest.indexOf('\r\n')), 10);
          let bulkString = rest.slice(rest.indexOf('\r\n') + 2, rest.indexOf('\r\n') + 2 + bulkLength);
          elements.push(bulkString);
          rest = rest.slice(rest.indexOf('\r\n') + 2 + bulkLength + 2);
        } else if (rest.startsWith('+')) {
          let simpleString = rest.slice(1, rest.indexOf('\r\n'));
          elements.push(simpleString);
          rest = rest.slice(rest.indexOf('\r\n') + 2);
        } else if (rest.startsWith(':')) {
          let integer = parseInt(rest.slice(1, rest.indexOf('\r\n')), 10);
          elements.push(integer);
          rest = rest.slice(rest.indexOf('\r\n') + 2);
        } else if (rest.startsWith('-')) {
          let error = rest.slice(1, rest.indexOf('\r\n'));
          elements.push(error);
          rest = rest.slice(rest.indexOf('\r\n') + 2);
        }
      }
      return elements;
    }
    throw new Error('Invalid Array format');
  }

  parseMap(str) {
    if (str.startsWith('%')) {
      const length = parseInt(str.slice(1, str.indexOf('\r\n')), 10);
      let map = new Map();
      let rest = str.slice(str.indexOf('\r\n') + 2);
      for (let i = 0; i < length; i++) {
        let key, value;

        if (rest.startsWith('$')) {
          let bulkLength = parseInt(rest.slice(1, rest.indexOf('\r\n')), 10);
          key = rest.slice(rest.indexOf('\r\n') + 2, rest.indexOf('\r\n') + 2 + bulkLength);
          rest = rest.slice(rest.indexOf('\r\n') + 2 + bulkLength + 2);
        }

        if (rest.startsWith('$')) {
          let bulkLength = parseInt(rest.slice(1, rest.indexOf('\r\n')), 10);
          value = rest.slice(rest.indexOf('\r\n') + 2, rest.indexOf('\r\n') + 2 + bulkLength);
          rest = rest.slice(rest.indexOf('\r\n') + 2 + bulkLength + 2);
        }

        map.set(key, value);
      }
      return map;
    }
    throw new Error('Invalid Map format');
  }

  parseSetData(str) {
    if (str.startsWith('~')) {
      const length = parseInt(str.slice(1, str.indexOf('\r\n')), 10);
      let set = new Set();
      let rest = str.slice(str.indexOf('\r\n') + 2);
      for (let i = 0; i < length; i++) {
        if (rest.startsWith('$')) {
          let bulkLength = parseInt(rest.slice(1, rest.indexOf('\r\n')), 10);
          let bulkString = rest.slice(rest.indexOf('\r\n') + 2, rest.indexOf('\r\n') + 2 + bulkLength);
          set.add(bulkString);
          rest = rest.slice(rest.indexOf('\r\n') + 2 + bulkLength + 2);
        }
      }
      return set;
    }
    throw new Error('Invalid Set format');
  }
}

module.exports = {
  decoder: new Decoder()
}