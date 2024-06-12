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
            TTL: this.handleTtl,
            LPUSH: this.handleLpush,
            LPOP: this.handleLpop,
            LRANGE: this.handleLrange
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
        storage[args[0]] = {value: args[1], ttl: -1}

        if(args.length == 4){

            if (args[2] == 'ex'){
                storage[args[0]].ttl = new Date()
                storage[args[0]].ttl.setSeconds(storage[args[0]].ttl.getSeconds() + args[3])

                setTimeout(() => {
                    delete storage[args[0]];
                }, args[3] * 1000);
            }
            else if (args[2] == 'px'){
                storage[args[0]].ttl = new Date()
                storage[args[0]].ttl.setMilliseconds(storage[args[0]].ttl.getMilliseconds() + args[3])

                setTimeout(() => {
                    delete storage[args[0]];
                }, args[3]);
            }
        }

        return encoder.encodeString('Ok')
    }

    handleGet(args, storage){
        console.log(storage[args[0]])

        if (storage[args[0]] != undefined && typeof storage[args[0]] != "object"){
            return encoder.encodeError("TYPE ERROR", "value type does not match")
        }

        return storage[args[0]] === undefined ? encoder.encodeError("UNDEFINED", "value not found") : encoder.encodeBulkString(storage[args[0]].value)
    }

    handleDel(args, storage){
        if(storage[args[0]] === undefined){
            return encoder.encodeError("UNDEFINED", "value not found")
        }
        else if (typeof storage[args[0]] != "object"){
            return encoder.encodeError("TYPE ERROR", "value type does not match")
        }
        delete storage[args[0]]
        return encoder.encodeString('Ok')
    }

    handleTtl(args, storage){
        return storage[args[0]] === undefined ? encoder.encodeError("UNDEFINED", "value not found") : encoder.encodeBulkString(storage[args[0]].ttl == -1 ? (-1).toString() : (storage[args[0]].ttl.getTime() - new Date().getTime()).toString())
    }

    handleLpush(args, storage){
        if(storage[args[0]] === undefined){
            storage[args[0]] = []
        }
        else if (!Array.isArray(storage[args[0]])){
            return encoder.encodeError("TYPE ERROR", "value type does not match")
        }
        
        for(let i = 1; i < args.length; i++){
            storage[args[0]].push(args[i])
        }

        return encoder.encodeString('Ok')
    }

    handleLpop(args, storage){
        if(storage[args[0]] === undefined){
            return encoder.encodeError("UNDEFINED", "value not found")
        }
        else if (!Array.isArray(storage[args[0]])){
            return encoder.encodeError("TYPE ERROR", "value type does not match")
        }

        let value = storage[args[0]].pop()
        if (storage[args[0]].length == 0){
            delete storage[args[0]]
        }

        return encoder.encodeBulkString(value.toString())
    }

    handleLrange(args, storage){
        if(storage[args[0]] === undefined){
            return encoder.encodeError("UNDEFINED", "value not found")
        }
        else if (!Array.isArray(storage[args[0]])){
            return encoder.encodeError("TYPE ERROR", "value type does not match")
        }

        const leftRange = parseInt(args[1])
        let rightRange = parseInt(args[2])

        if(isNaN(leftRange) || isNaN(rightRange)){
            return encoder.encodeError("ARGUMENT ERROR", "argument type does not match")
        }
        else if (leftRange >= storage[args[0]].length){
            return encoder.encodeArray([])
        }

        rightRange = rightRange >= storage[args[0]].length || rightRange < 0 ? storage[args[0]].length-1 : rightRange

        return encoder.encodeArray(storage[args[0]].slice(leftRange, rightRange))
    }
}

module.exports = {
    handler: new Handler()
}