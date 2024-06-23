const OPCODES = {
	EOF: 0xff,
	SELECTDB: 0xfe,
	EXPIRETIME: 0xfd,
	EXPIRETIMEMS: 0xfc,
	RESIZEDB: 0xfb,
	AUX: 0xfa,
};

const redis_main_const = {
	REDIS_MAGIC_STRING: 5,
	REDIS_VERSION: 4,
};

function handleLengthEncoding(data, cursor) {
    const byte = data[cursor];
    const lengthType = (byte & 0b11000000) >> 6;

    const lengthValues = [
        [byte & 0b00111111, cursor + 1],
        [((byte & 0b00111111) << 8) | data[cursor + 1], cursor + 2],
        [data.readUInt32BE(cursor + 1), cursor + 5],
    ];

    return (
        lengthValues[lengthType] || new Error(`Invalid length encoding ${lengthType} at ${cursor}`)
    );
}

class RdbWriter{

}

class RdbReader{
    getKeysValues(data) {
        const { REDIS_MAGIC_STRING, REDIS_VERSION } = redis_main_const;
        const parsedKeyValueSet = new Map();
        const parsedExpiryTimeSet = new Map();
        let cursor = REDIS_MAGIC_STRING + REDIS_VERSION;
        let length;
        let rdbEOF = false;
    
        while (cursor < data.length) {
            if (data[cursor] === OPCODES.SELECTDB) {
                break;
            }
            cursor++;
        }
    
        while (cursor < data.length && !rdbEOF) {
            let expTime = undefined;
            let dbNumber = undefined;
    
            if (data[cursor] === OPCODES.SELECTDB) {
                cursor++;

                [length, cursor] = handleLengthEncoding(data, cursor);
                dbNumber = data.subarray(cursor + 1, cursor + 1 + length);

                cursor++;
    
                [length, cursor] = handleLengthEncoding(data, cursor);
                [length, cursor] = handleLengthEncoding(data, cursor);
    
            }
    
            switch (data[cursor]) {
                case OPCODES.EXPIRETIME:
                    cursor++;
    
                    expTime = data.subarray(cursor, cursor + 4).readUInt32LE() * 1000;
                    expTime = new Date(Number(data.subarray(cursor, cursor + 4).readUInt32LE() * 1000));
    
                    cursor += 4;
                    break;
    
                case OPCODES.EXPIRETIMEMS:
                    cursor++;
    
                    expTime = data.subarray(cursor, cursor + 8).readDoubleLE();
                    expTime = new Date(Number(data.subarray(cursor, cursor + 8).readBigUInt64LE()));
    
                    cursor += 8;
                    break;
    
                case OPCODES.EOF:
                    rdbEOF = true;
                    continue;
    
                default:
                    break;
    
            }
    
            const valueType = data[cursor];
            cursor++;
    
            const redisKeyLength = data[cursor];
            const redisKey = data.subarray(cursor + 1, cursor + 1 + redisKeyLength).toString();
    
            cursor = cursor + 1 + redisKeyLength;
            const redisValueLength = data[cursor];
            const redisValue = data.subarray(cursor + 1, cursor + 1 + redisValueLength).toString();
            cursor += redisValueLength;
    
            parsedKeyValueSet.set(redisKey, redisValue);
            expTime && parsedExpiryTimeSet.set(redisKey, expTime);
            cursor++; 
        }
    
        return [parsedKeyValueSet, parsedExpiryTimeSet];
    
    }
}