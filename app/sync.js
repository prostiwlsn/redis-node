const fs = require('fs');
const encoder = require('../resp/encoder').encoder;

const DEFAULT_AOF_DIRECTORY = "./db.aof"

function sync(storage, command){
    if(!storage.isMaster){
        return
    }

    for(let i = 0; i < storage.replicas.length; i++){
        storage.replicas[i].connection.write(command)
    }
}

function resync(filePath = DEFAULT_AOF_DIRECTORY){
    try{
        return fs.readFileSync(filePath, 'utf8');
    }
    catch (err){
        console.log(err)
        return encoder.encodeArray([])
    }
}

module.exports = {
    sync: sync,
    resync: resync
}