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
}