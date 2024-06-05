const CRLF = '\r\n'

class Encoder{
    static encodeCommand(command){
        const parts = command.split(" ")

        let finalString = ""
        
        finalString += '*' + parts.length + CRLF

        finalString += '$' + parts[0].length + CRLF + parts[0].toUpperCase() + CRLF

        for (let i = 1; i < parts.length; i++){
            finalString += encodeBulkString(parts[i])
        }

        return finalString
    }

    static encodeBulkString(bulkString){
        return '$' + bulkString.length + CRLF + bulkString + CRLF
    }

    static encodeString (str) {
        '+' + str + CRLF
    }

    static encodeInteger (num) {
        ':' + num + CRLF
    }

    static encodeNull () {
        '$-1\r\n'
    }

    static encodeNullArray(){
        '*-1\r\n'
    }

    static encodeArray (arr) {
        if (!Array.isArray(arr)) throw new Error(String(arr) + ' must be Array object')
        const prefix = '*' + arr.length + CRLF
        let length = prefix.length
        const bufs = [Buffer.from(prefix)]
    
        for (let buf, i = 0, len = arr.length; i < len; i++) {
            buf = arr[i]
            buf = Resp.encodeArray(buf)
            bufs.push(buf)
            length += buf.length
        }
    
        return Buffer.concat(bufs, length).toString()
    }

    static encodeError (name, message) {
        '-' + name + ' ' + message + CRLF
    }
}