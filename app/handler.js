const encoder = require('../resp/encoder');
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
        parsedCommand = decoder.parse(command)

        return commands[parsedCommand.command](parsedCommand.args, storage)
    }

    handlePing(args, storage){
        return Encoder.encodeString('PONG')
    }

    handleEcho(args, storage){
        return Encoder.encodeBulkString(command.args[0])
    }

    handleSet(args, storage){

    }

    handleGet(args, storage){

    }

    handleDel(args, storage){

    }
}

module.exports = {
    handler: new Handler()
  }