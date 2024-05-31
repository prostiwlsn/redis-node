const CRLF = "\r\n"

export default class Parser {
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
      let parts = input.trim().split("\r\n");

      const attributePatern = /^[$*:].*/

      parts = parts.filter(part => !attributePatern.test(part))

      const command = parts[0].toUpperCase();
      const args = parts.slice(1);
  
      if (this.commands[command]) {
        return this.commands[command](args);
      } else {
        throw new Error(`Unknown command: ${command}`);
      }
    }
  
    parsePing(args) {
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
      return { command: 'SET', args: [args[0], args.slice(1).join(' ')] };
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
}