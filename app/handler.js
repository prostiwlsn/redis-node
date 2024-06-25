const encoder = require('../resp/encoder').encoder;
const decoder = require('../resp/decoder').decoder;
const writer = require('./aof').writer;
const reader = require('./aof').reader;
const sync = require('./sync').sync
const resync = require('./sync').resync

const {RDBReader, RDBWriter} = require('./rdb')

const rdbWriter = new RDBWriter('./db.rdb')
const rdbReader = new RDBReader('./db.rdb')

const globalCommands = ["SELECT", "LOAD", "SAVE"]
const replCommands = ["REPLCONF", "PSYNC"]
const getCommands = ["PING", "ECHO", "GET", "LRANGE", "HGET", "HGETALL"]

class SortedSet{
    constructor(){
        this.values = []
    }

    addElement(key, value){
        if(this.values.filter(value => value.key == key).length != 0){
            this.values = this.values.filter(value => value.key != key)
        }
        this.values.push({key, value})

        this.values.sort((a, b) => a.value - b)
    }

    rangeElements(start, end){
        let returnValues = []

        for(let i = start; i < end; i ++){
            returnValues.push(this.values[i].key)
            returnValues.push(this.values[i].value)
        }
        return returnValues
    }

    getScore(key){
        return this.values.filter(value => value.key == key)[0]
    }
}

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
            LRANGE: this.handleLrange,
            SELECT: this.handleSelect,
            HSET: this.handleHset,
            HGET: this.handleHget,
            HGETALL: this.handleHgetall,
            REPLCONF: this.handleReplconf,
            PSYNC: this.handlePsync,
            SADD: this.handleSadd,
            SMEMBERS: this.handleSmembers,
            SINTER: this.handleSinter,
            SDIFF: this.handleSdiff,
            SUNION: this.handleSunion,
            ZADD: this.handleZadd,
            ZRANGE: this.handleZrange,
            ZSCORE: this.handleZscore,
            SAVE: this.handleSave,
            LOAD: this.handleLoad
        };
    }

    handleCommand(command, storage, isWritable = true, isResyncMode = false, connection = undefined, isSyncMode = false){
        let parsedCommand;

        try{
            parsedCommand = decoder.parse(command)
        }
        catch{
            return encoder.encodeError("PARSING ERROR", "The command cannot be parsed")
        }

        try{
            if(globalCommands.includes(parsedCommand.command)){
                sync(storage, command)

                try{
                    if(isWritable && !getCommands.includes(parsedCommand.command) && storage.isMaster && parsedCommand != undefined && parsedCommand.command != undefined){
                        writer.write(command)
                    }
                }
                catch{
                    console.log("The command cannot be written")
                }

                return this.commands[parsedCommand.command](parsedCommand.args, storage)
            }
            else if(replCommands.includes(parsedCommand.command)){
                return this.commands[parsedCommand.command](parsedCommand.args, storage, connection)
            }

            if(storage.isMaster || getCommands.includes(parsedCommand.command) || isResyncMode || isSyncMode){
                const result = this.commands[parsedCommand.command](parsedCommand.args, storage["DB_"+storage.SELECTED_DB_NUMBER])

                if(!getCommands.includes(parsedCommand.command) && !replCommands.includes(parsedCommand.command) && storage.isMaster){
                    sync(storage, encoder.encodeCommand("SELECT " + storage.SELECTED_DB_NUMBER))
                    sync(storage, command)
                }

                try{
                    if(isWritable && !getCommands.includes(parsedCommand.command) && storage.isMaster && parsedCommand != undefined && parsedCommand.command != undefined){
                        writer.write(command)
                    }
                }
                catch{
                    console.log("The command cannot be written")
                }

                return result
            }
            else{
                return encoder.encodeError("ERR", "this server is a replica")
            }
        }
        catch(err){
            console.log(err)

            return encoder.encodeError("EXECUTION ERROR", "The command cannot be executed: " + err.message)
        }
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

        rightRange = rightRange >= storage[args[0]].length || rightRange < 0 ? storage[args[0]].length : rightRange+1

        return encoder.encodeArray(storage[args[0]].slice(leftRange, rightRange))
    }

    handleSelect(args, storage){
        storage.SELECTED_DB_NUMBER = args[0] //["DB_"+storage.SELECTED_DB_NUMBER]

        if (storage["DB_"+storage.SELECTED_DB_NUMBER] == undefined){
            storage["DB_"+storage.SELECTED_DB_NUMBER] = {}
        }

        return encoder.encodeString('Ok')
    }

    handleHset(args, storage){
        storage[args[0]] = new Map();

        for (let i = 1; i < args.length; i += 2){
            storage[args[0]].set(args[i], args[i+1])
        }

        console.log(storage[args[0]])

        return encoder.encodeString('Ok')
    }

    handleHget(args, storage){
        if(storage[args[0]] === undefined){
            return encoder.encodeError("UNDEFINED", "value not found")
        }
        else if (!storage[args[0]] instanceof Map){
            return encoder.encodeError("TYPE ERROR", "value type does not match")
        }

        console.log(storage[args[0]].get(args[1]), typeof storage[args[0]].get(args[1]))
        
        return storage[args[0]].get(args[1]) != undefined ? encoder.encodeBulkString(storage[args[0]].get(args[1])) : encoder.encodeNull()
    }

    handleHgetall(args, storage){
        if(storage[args[0]] === undefined){
            return encoder.encodeError("UNDEFINED", "value not found")
        }
        else if (!storage[args[0]]  instanceof Map){
            return encoder.encodeError("TYPE ERROR", "value type does not match")
        }

        let result = []

        for (let [key, value] of storage[args[0]]){
            result.push(key)
            result.push(value)
        }

        return encoder.encodeArray(result)
    }

    handleReplconf(args, storage, connection){
        if(args[0] == "listening-port"){
            storage.replicas.push({port: parseInt(args[0]), id: storage.replicaIncrId, connection})
            storage.replicaIncrId++
            return encoder.encodeString("OK")
        }
        else if(args[0] == "capa"){
            return encoder.encodeString("OK")
        }
        else{
            return encoder.encodeError("ERR", "wrong args")
        }
    }

    handlePsync(args, storage, connection){
        if(args[0] == "?" && args[1] == "-1" && args.length == 2){
            return encoder.encodeString("FULLRESYNC " + storage.master_replid + " 0") + resync()
        }
        else if (args.length != 2){
            return encoder.encodeError("ERR", "wrong args")
        }
        else{
            return encoder.encodeString("OK")
        }
    }

    handleResync(storage, commandString){
        storage.isResyncMode = false

        reader.readFromString(commandString)
    }

    handleSadd(args, storage){
        if(storage[args[0]] == undefined){
            storage[args[0]] = new Set()
        }

        for(let i = 1; i < args.length; i++){
            storage[args[0]].add(args[i])
        }

        return encodeString("OK")
    }

    handleSmembers(args, storage){
        if(storage[args[0]] == undefined){
            return encoder.encodeNull()
        }
        else if(!(storage[args[0]] instanceof Set)){
            return encoder.encodeError("TYPE ERROR", "this value is not a set")
        }
        else{
            return encoder.encodeArray(Array.from(storage[args[0]]))
        }
    }

    handleSinter(args, storage){
        if(storage[args[0]] == undefined || storage[args[1]] == undefined){
            return encoder.encodeNull()
        }
        else if(!(storage[args[0]] instanceof Set && storage[args[1]] instanceof Set)){
            return encoder.encodeError("TYPE ERROR", "this value is not a set")
        }
        else{
            return encoder.encodeArray(Array.from(storage[args[0]].intersection(storage[args[1]])))
        }
    }

    handleSdiff(args, storage){
        if(storage[args[0]] == undefined || storage[args[1]] == undefined){
            return encoder.encodeNull()
        }
        else if(!(storage[args[0]] instanceof Set && storage[args[1]] instanceof Set)){
            return encoder.encodeError("TYPE ERROR", "this value is not a set")
        }
        else{
            return encoder.encodeArray(Array.from(storage[args[0]].difference(storage[args[1]])))
        }
    }

    handleSunion(args, storage){
        if(storage[args[0]] == undefined || storage[args[1]] == undefined){
            return encoder.encodeNull()
        }
        else if(!(storage[args[0]] instanceof Set && storage[args[1]] instanceof Set)){
            return encoder.encodeError("TYPE ERROR", "this value is not a set")
        }
        else{
            return encoder.encodeArray(Array.from(storage[args[0]].union(storage[args[1]])))
        }
    }

    handleZadd(args, storage){
        if(storage[args[0]] == undefined){
            storage[args[0]] = new SortedSet()
        }
        else if(!(storage[args[0]] instanceof SortedSet)){
            return encoder.encodeError("TYPE ERROR", "this value is not a sorted set")
        }
        
        for(let i = 1; i < args.length; i++){
            storage[args[0]].add(args[i])
        }

        return encoder.encodeString("OK")
    }

    handleZrange(args, storage){
        if(storage[args[0]] == undefined){
            return encoder.encodeNull()
        }
        else if(!(storage[args[0]] instanceof Set && storage[args[1]] instanceof Set)){
            return encoder.encodeError("TYPE ERROR", "this value is not a set")
        }
        else{
            return encoder.encodeArray(storage[args[0]].rangeElements(parseInt(args[1]), parseInt(args[2])))
        }
    }

    handleZscore(args, storage){
        if(storage[args[0]] == undefined){
            return encoder.encodeNull()
        }
        else if(!(storage[args[0]] instanceof Set && storage[args[1]] instanceof Set)){
            return encoder.encodeError("TYPE ERROR", "this value is not a set")
        }
        else{
            return encoder.encodeBulkString(storage[args[0]].getScore(args[1]))
        }
    }

    handleSave(args, storage){
        rdbWriter.write(rdbWriter.dbToDump(storage))
        return encoder.encodeString("OK")
    }

    handleLoad(args, storage){
        const newDb = rdbReader.dumpToDb(rdbReader.read())
        newDb.isMaster = storage.isMaster
        newDb.replicas = storage.replicas
        newDb.replicaIncrId = storage.replicaIncrId
        newDb.master_replid = storage.replicaIncrId
        newDb.master_repl_offset = storage.master_repl_offset
        newDb.isResyncMode = storage.isResyncMode
        newDb.isSyncMode = storage.isSyncMode
        return encoder.encodeString("OK")
    }
}

module.exports = {
    handler: new Handler(),
    SortedSet
}