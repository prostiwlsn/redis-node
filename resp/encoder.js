const CRLF = '\r\n'

class Encoder{
    static encodeCommand (command){
        //const parts = command.split(" ")
        const parts = [];
        let part = '';
        let insideQuotes = false;

        for (let i = 0; i < command.length; i++) {
        if (command[i] === ' ' && !insideQuotes) {
            if (part !== '') {
            parts.push(part);
            part = '';
            }
        } else if (command[i] === '"') {
            insideQuotes = !insideQuotes;
        } else {
            part += command[i];
        }
        }

        if (part !== '') {
            parts.push(part);
        }

        parts[parts.length - 1] = parts[parts.length - 1].replace(/\r\n/g, "")
        console.log(parts)

        let finalString = ""
        
        finalString += '*' + parts.length + CRLF

        finalString += '$' + parts[0].length + CRLF + parts[0].toUpperCase() + CRLF

        for (let i = 1; i < parts.length; i++){
            finalString += this.encodeBulkString(parts[i])
        }

        console.log(JSON.stringify(finalString))

        return finalString
    }

    static encodeBulkString(bulkString){
        return '$' + bulkString.length + CRLF + bulkString + CRLF
    }

    static encodeString (str) {
        return '+' + str + CRLF
    }

    static encodeInteger (num) {
        return ':' + num + CRLF
    }

    static encodeBigInteger (num) {
        return '(' + num + CRLF
    }

    static encodeDouble (num) {
        if (num == Infinity){
            return ',' + 'inf' + CRLF
        }
        else if (num == Number.NEGATIVE_INFINITY){
            return ',' + '-inf' + CRLF
        }
        else if (isNaN(num)){
            return ',' + 'nan' + CRLF
        }

        return ',' + num + CRLF
    }

    static encodeBool (value) {
        return '#' + value + CRLF
    }

    static encodeNull () {
        return '$_\r\n'
    }

    static encodeNullArray(){
        return '*-1\r\n'
    }

    static encodeArray (arr) {
        const count = arr.length
        let finalString = '*' + count + CRLF

        for (let value of arr) {
            finalString += this.parseValue(value)
        }

        return finalString
    }

    static encodeError (name, message) {
        return '-' + name + ' ' + message + CRLF
    }

    static encodeBulkError (name, message){
        const error = name + ' ' + message
        return '!' + error.length + CRLF + error + CRLF
    }

    static encodeVerbatimString(str){
        return '=' + str.length + CRLF + str + CRLF
    }

    static parseValue(value){
        return this.encodeInteger(value)
    }

    static encodeMap(map){
        const count = map.size
        let finalString = '%' + count + CRLF

        map.forEach((value, key, map) => {
            finalString += this.encodeString(key.toString())
            finalString += this.parseValue(value)
        })

        return finalString
    }

    static encodeSet(set){
        const count = set.size;
        let finalString = '~' + count + CRLF

        for (let value of set) {
            finalString += this.parseValue(value)
        }

        return finalString
    }

    static encodePush(set){
        const count = set.size;
        let finalString = '>' + count + CRLF

        for (let value of set) {
            finalString += this.parseValue(value)
        }

        return finalString
    }
}

module.exports = {
    encoder: Encoder
}