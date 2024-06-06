const encoder = require('../resp/encoder').encoder;
const decoder = require('../resp/decoder').decoder;

class Handler {
    constructor() {
        this.commands = {
            PING: this.handlePing,
            ECHO: this.handleEcho,
            SET: this.handleSet,
            GET: this.handleGet,
            DEL: this.handleDel,
        };
    }

    handleCommand(command, storage){
        let parsedCommand = decoder.parse(command)

        return this.commands[parsedCommand.command](parsedCommand.args, storage)
    }

    handlePing(args, storage){
        return encoder.encodeString('PONG')
    }

    handleEcho(args, storage){
        return encoder.encodeBulkString(args[0])
    }

    handleSet(args, storage){
        storage[args[0]] = args[1]
        return encoder.encodeString('Ok')
    }

    handleGet(args, storage){
        return storage[args[0]] === undefined ? encoder.encodeError("UNDEFINED", "value not found") : encoder.encodeBulkString(storage[args[0]])
    }

    handleDel(args, storage){
        if(storage[args[0]] === undefined){
            return encoder.encodeError("UNDEFINED", "value not found")
        }
        delete storage[args[0]]
        return encoder.encodeString('Ok')
    }
}

module.exports = {
    handler: new Handler()
  }