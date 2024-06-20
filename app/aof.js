const fs = require('fs');

const CRLF = "\r\n"
const DEFAULT_AOF_DIRECTORY = "./db.aof"

class AofConfig{
}

class AofReader{
    read(handler, storage, filePath = DEFAULT_AOF_DIRECTORY){
        let wholeText = ""
        try{
            wholeText = fs.readFileSync(filePath, 'utf8');
        }
        catch (err){
            console.log(err)
        }

        if (wholeText.length == 0){
            return
        }

        let index = 0;
        let parts = wholeText.split(CRLF)

        while (index <= parts.length){
            const nextIndex = (parseInt(parts[index][1]) * 2 + index) + 1

            const command = parts.slice(index, nextIndex).join(CRLF) + (nextIndex < parts.length ? CRLF : "");

            console.log(index, nextIndex, parts.length)

            if (command.length == 0){
                break
            }

            handler.handleCommand(command, storage, false)

            index = nextIndex
        }
    }

    readFromString(handler, storage, commandString){
        if (commandString.length == 0){
            return
        }

        let index = 0;
        let parts = commandString.split(CRLF)

        while (index <= parts.length){
            const nextIndex = (parseInt(parts[index][1]) * 2 + index) + 1

            const command = parts.slice(index, nextIndex).join(CRLF) + (nextIndex < parts.length ? CRLF : "");

            console.log(index, nextIndex, parts.length)

            if (command.length == 0){
                break
            }

            try{
                handler.handleCommand(command, storage, false, false, undefined, true)
            }
            catch(err){
                console.log(err.message)
            }

            index = nextIndex
        }
    }
}

class AofWriter{
    write(command, filePath = DEFAULT_AOF_DIRECTORY){
        fs.open(filePath, 'a', (err, fd) => {
            if (err) {
                console.error(err);
                return;
            }
            fs.close(fd, (err) => {
                if (err) {
                    console.error(err);
                }
            });
        });
        
        fs.appendFile(filePath, command, (err) => {
            if (err) {
                console.error(err);
                return;
            }
        });
    }
}

module.exports = {
    config: new AofConfig(),
    reader: new AofReader(),
    writer: new AofWriter()
}