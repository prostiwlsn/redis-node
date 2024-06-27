const SELECTDB_OPCODE = 0xFE;
const STRING_TYPE = 0;
const LIST_TYPE = 1;
const HASH_TYPE = 2;
const SET_TYPE = 3;
const SORTED_SET_TYPE = 4;
const fs = require('fs');
const { Buffer } = require('buffer');
const {SortedSet} = require('./sortedSet')

class RDBWriter {
    constructor(filePath) {
        this.filePath = filePath;
    }

    dbToDump(db){
        let returnArray = []
        let dbNumber = 0

        for (const [key, value] of Object.entries(db)) {
            let selected_db = {
                strings: new Map(),
                lists: new Map(),
                hashes: new Map(),
                sets: new Map(),
                sortedSets: new Map()
            }

            console.log(value)
            if(typeof value == "object" && key[0] + key[1] + key[2] == "DB_"){
                for (const [keyy, val] of Object.entries(value)) {
                    if(typeof val.value == "string"){
                        selected_db.strings.set(keyy, val.value)
                    }
                    else if(val instanceof Map){
                        selected_db.hashes.set(keyy, Object.fromEntries(val))
                    }
                    else if (val instanceof Set){
                        selected_db.sets.set(keyy, val)
                    }
                    else if (val instanceof SortedSet){
                        selected_db.sortedSets.set(keyy, val)
                    }
                    else if(Array.isArray(val)){
                        selected_db.lists.set(keyy, val)
                    }
                }
                dbNumber++
                returnArray.push(selected_db)
            }
    
        }

        return returnArray
    }

    write(databases) {
        fs.unlink(this.filePath, (err) => {
            if (err) {
              console.error(err);
              return;
            }
            console.log('File deleted');
        });

        const bufferArray = [];

        const writeString = (str) => {
            const strBuffer = Buffer.from(str);
            bufferArray.push(strBuffer);
        };

        const writeByte = (byte) => {
            const byteBuffer = Buffer.alloc(1);
            byteBuffer.writeUInt8(byte);
            bufferArray.push(byteBuffer);
        };

        const writeInt = (int) => {
            const intBuffer = Buffer.alloc(4);
            intBuffer.writeUInt32BE(int);
            bufferArray.push(intBuffer);
        };

        writeString('REDIS');
        writeString('0009');

        databases.forEach((db, index) => {
            if (db.strings.size > 0 || db.lists.size > 0 || db.hashes.size > 0) {
                writeByte(SELECTDB_OPCODE);
                writeInt(index);

                db.strings.forEach((value, key) => {
                    writeByte(STRING_TYPE);
                    writeInt(Buffer.byteLength(key));
                    writeString(key);
                    writeInt(Buffer.byteLength(value));
                    writeString(value);
                });

                db.lists.forEach((list, key) => {
                    writeByte(LIST_TYPE);
                    writeInt(Buffer.byteLength(key));
                    writeString(key);
                    writeInt(list.length);
                    list.forEach(item => {
                        writeInt(Buffer.byteLength(item));
                        writeString(item);
                    });
                });

                db.hashes.forEach((hash, key) => {
                    writeByte(HASH_TYPE);
                    writeInt(Buffer.byteLength(key));
                    writeString(key);
                    const entries = Object.entries(hash);
                    writeInt(entries.length);
                    entries.forEach(([field, value]) => {
                        writeInt(Buffer.byteLength(field));
                        writeString(field);
                        writeInt(Buffer.byteLength(value));
                        writeString(value);
                    });
                });

                db.sets.forEach((list, key) => {
                    writeByte(SET_TYPE);
                    writeInt(Buffer.byteLength(key));
                    writeString(key);
                    writeInt(list.size);
                    console.log(list.size, list)
                    list.forEach(item => {
                        writeInt(Buffer.byteLength(item));
                        writeString(item);
                    });
                });

                db.sortedSets.forEach((set, key) => {
                    writeByte(SORTED_SET_TYPE);
                    writeInt(Buffer.byteLength(key));
                    writeString(key);
                    writeInt(set.values.length);
                    set.values.forEach(item => {
                        writeInt(Buffer.byteLength(item.key));
                        writeString(item.key);
                        writeInt(Buffer.byteLength(item.value));
                        writeString(item.value);
                    });
                });
            }
        });

        writeByte(0xFF); // End of file

        const finalBuffer = Buffer.concat(bufferArray);
        fs.writeFileSync(this.filePath, finalBuffer);
    }
}

class RDBReader {
    constructor(filePath) {
        this.filePath = filePath;
    }
    
    dumpToDb(dump){
        let db = {}
        for(let kvObject of dump){
            if(db["DB_" + kvObject.db] == undefined){
                db["DB_" + kvObject.db] = {}
            }
    
            if(kvObject.type == "hash"){
                db["DB_" + kvObject.db][kvObject.key] = new Map(Object.entries(kvObject.value))
            }
            else if (kvObject.type == "string"){
                db["DB_" + kvObject.db][kvObject.key] = {value: kvObject.value, ttl: -1}
            }
            else{
                db["DB_" + kvObject.db][kvObject.key] = kvObject.value
            }
        }

        return db
    }

    read() {
        const data = fs.readFileSync(this.filePath);
        const buffer = Buffer.from(data);
        let offset = 0;
        let currentDb = 0;

        const readByte = () => buffer.readUInt8(offset++);
        const readInt = () => {
            const result = buffer.readUInt32BE(offset);
            offset += 4;
            return result;
        };

        const header = buffer.slice(0, 5).toString();
        if (header !== 'REDIS') {
            throw new Error('Invalid RDB file');
        }
        offset += 5;

        const version = parseInt(buffer.slice(5, 9).toString(), 10);
        console.log(`RDB Version: ${version}`);
        offset += 4;

        const entries = [];

        while (offset < buffer.length) {
            const dataType = readByte();
            if (dataType === 0xFF) {
                break; // End of file
            } else if (dataType === SELECTDB_OPCODE) {
                currentDb = readInt();
                continue;
            }

            const keyLength = readInt();
            const key = buffer.slice(offset, offset + keyLength).toString();
            offset += keyLength;

            console.log(key, offset)
            if (dataType === STRING_TYPE) {
                const valueLength = readInt();
                const value = buffer.slice(offset, offset + valueLength).toString();
                offset += valueLength;
                entries.push({ db: currentDb, type: 'string', key, value });
            } else if (dataType === LIST_TYPE) {
                const listLength = readInt();
                const list = [];
                for (let i = 0; i < listLength; i++) {
                    const itemLength = readInt();
                    const item = buffer.slice(offset, offset + itemLength).toString();
                    offset += itemLength;
                    list.push(item);
                }
                entries.push({ db: currentDb, type: 'list', key, value: list });
            } else if (dataType === HASH_TYPE) {
                const hashLength = readInt();
                const hash = {};
                for (let i = 0; i < hashLength; i++) {
                    const fieldLength = readInt();
                    const field = buffer.slice(offset, offset + fieldLength).toString();
                    offset += fieldLength;
                    const valueLength = readInt();
                    const value = buffer.slice(offset, offset + valueLength).toString();
                    offset += valueLength;
                    hash[field] = value;
                }
                entries.push({ db: currentDb, type: 'hash', key, value: hash });
            }
            else if (dataType === SET_TYPE){
                const listLength = readInt();
                const list = new Set();
                for (let i = 0; i < listLength; i++) {
                    const itemLength = readInt();
                    const item = buffer.slice(offset, offset + itemLength).toString();
                    offset += itemLength;
                    list.add(item);
                }
                entries.push({ db: currentDb, type: 'set', key, value: list });
            }
            else if (dataType === SORTED_SET_TYPE) {
                const hashLength = readInt();
                const hash = new SortedSet();
                for (let i = 0; i < hashLength; i++) {
                    const fieldLength = readInt();
                    const field = buffer.slice(offset, offset + fieldLength).toString();
                    offset += fieldLength;
                    const valueLength = readInt();
                    const value = buffer.slice(offset, offset + valueLength).toString();
                    offset += valueLength;
                    hash.addElement(field, value)
                }
                entries.push({ db: currentDb, type: 'sortedSet', key, value: hash });
            }
        }

        return entries;
    }
}

module.exports = {
    RDBReader,
    RDBWriter
}