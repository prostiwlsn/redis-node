const SELECTDB_OPCODE = 0xFE;
const STRING_TYPE = 0;
const LIST_TYPE = 1;
const HASH_TYPE = 2;
const fs = require('fs');
const { Buffer } = require('buffer');

class RDBWriter {
    constructor(filePath) {
        this.filePath = filePath;
    }

    write(databases) {
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

        // Write the RDB file header
        writeString('REDIS');
        writeString('0009'); // Assuming version 9

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

        // Verify the RDB file header
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
        }

        return entries;
    }
}