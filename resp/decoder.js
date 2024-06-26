const CRLF = "\r\n"

class Decoder {
  constructor() {
    this.commands = {
      PING: this.parsePing,
      ECHO: this.parseEcho,
      SET: this.parseSet,
      GET: this.parseGet,
      DEL: this.parseDel,
      TTL: this.parseTtl,
      LPUSH: this.parseLpush,
      LPOP: this.parseLpop,
      LRANGE: this.parseLrange,
      SELECT: this.parseSelect,
      HSET: this.parseHset,
      HGET: this.parseHget,
      HGETALL: this.parseHgetall,
      REPLCONF: this.parseReplconf,
      PSYNC: this.parsePsync,
      SADD: this.parseSadd,
      SMEMBERS: this.parseSmembers,
      SINTER: this.parseSinter,
      SDIFF: this.parseSdiff,
      SUNION: this.parseSunion,
      ZADD: this.parseZadd,
      ZRANGE: this.parseZrange,
      ZSCORE: this.parseZscore,
      SAVE: this.parseSave,
      LOAD: this.parseLoad
    };
  }

  parseResponse(input){
    if(input == '$_\r\n' || input == '*-1\r\n'){
      return "null"
    }

    const firstByte = input[0]
    switch(firstByte){
      case '*':
        return this.parseArray(input)
      case '$':
        return this.parseBulkString(input)
      case '+':
        return this.parseString(input)
      case '-':
        return this.parseError(input)
      default:
        return JSON.stringify(input)
    }
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
    if (args.length != 2 && args.length != 4) {
      throw new Error('SET command requires two or four arguments');
    }

    if (args.length == 4){
      if (args[2] != "ex" && args[2] != "px"){
        throw new Error('Invalid argument')
      }

      if (isNaN(parseInt(args[3]))){
        throw new Error('Invalid time period')
      }

      return { command: 'SET', args: [args[0], args[1], args[2], parseInt(args[3])] };
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

  parseTtl(args){
    if (args.length != 1) {
      throw new Error('TTL command requires only one argument');
    }
    return { command: 'TTL', args: args };
  }

  parseLpush(args){
    if (args.length < 2) {
      throw new Error('LPUSH command requires at least two arguments');
    }

    return { command: 'LPUSH', args: args };
  }

  parseLpop(args){
    if (args.length != 1) {
      throw new Error('LPOP command requires only one argument');
    }

    return { command: 'LPOP', args: args };
  }

  parseLrange(args){
    if (args.length != 3) {
      throw new Error('LRANGE command requires only three arguments');
    }

    return { command: 'LRANGE', args: args };
  }

  parseSelect(args){
    if (args.length != 1){
      throw new Error('SELECT command requires only one argument');
    }
    if(isNaN(parseInt(args[0]))){
      throw new Error('Wrong argument type');
    }

    return { command: 'SELECT', args: [parseInt(args[0])] };
  }

  parseHset(args){
    if (args.length % 2 == 0 || args.length <= 2){
      throw new Error('Wrong argumens')
    }

    return { command: 'HSET', args: args };
  }

  parseHget(args){
    if (args.length !== 2) {
      throw new Error('HGET command requires exactly one argument');
    }

    return { command: 'HGET', args: args };
  }

  parseHgetall(args){
    if (args.length !== 1) {
      throw new Error('HGETALL command requires exactly one argument');
    }

    return { command: 'HGETALL', args: args };
  }

  parseReplconf(args){
    return { command: 'REPLCONF', args: args };
  }

  parsePsync(args){
    if (args.length !== 2) {
      throw new Error('PSYNC command requires exactly two arguments');
    }

    return { command: 'PSYNC', args: args };
  }

  parseSadd(args){
    if (args.length < 2) {
      throw new Error('SADD command requires at least two arguments');
    }

    return { command: 'SADD', args: args };
  }

  parseSmembers(args){
    if (args.length != 1) {
      throw new Error('SMEMBERS command requires exactly one argument');
    }

    return { command: 'SMEMBERS', args: args };
  }

  parseSinter(args){
    if (args.length != 2) {
      throw new Error('SINTER command requires exactly two arguments');
    }

    return { command: 'SINTER', args: args };
  }

  parseSdiff(args){
    if (args.length != 2) {
      throw new Error('SDIFF command requires exactly two arguments');
    }

    return { command: 'SDIFF', args: args };
  }

  parseSunion(args){
    if (args.length != 2) {
      throw new Error('SUNION command requires exactly two arguments');
    }

    return { command: 'SUNION', args: args };
  }

  parseZadd(args){
    if (args.length < 3 || args.length % 2 != 1) {
      console.log(1, args)
      throw new Error('ZADD command requires at least three arguments');
    }
    else if(args.filter((arg, index) => isNaN(parseInt(arg)) && index % 2 == 0 && index != 0).length != 0){
      console.log(2, args, args.filter((arg, index) => isNaN(parseInt(arg)) && index % 2 == 1 && index != 0))
      throw new Error('wrong arguments');
    }

    return { command: 'ZADD', args: args };
  }

  parseZrange(args){
    if (args.length != 3) {
      throw new Error('ZRANGE command requires exactly three arguments');
    }
    else if(isNaN(parseInt(args[1]) || isNaN(parseInt(args[2]))) ){
      throw new Error('wrong arguments');
    }

    return { command: 'ZRANGE', args: args };
  }

  parseZscore(args){
    if (args.length != 2) {
      throw new Error('ZSCORE command requires exactly two arguments');
    }

    return { command: 'ZSCORE', args: args };
  }

  parseSave(args){
    return { command: 'SAVE', args: args };
  }

  parseLoad(args){
    return { command: 'LOAD', args: args };
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

  parseInteger(str) {
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