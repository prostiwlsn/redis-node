const handler = require("./handler").handler;
const encoder = require("../resp/encoder").encoder
const reader = require("./aof").reader
const net = require("net");
const CRLF = "\r\n" 

const portIdx = process.argv.indexOf("--port")
const PORT = portIdx == -1 ? 6379 : process.argv[portIdx + 1]

const replicaofIdx = process.argv.indexOf("--replicaof")
const masterInfo = replicaofIdx == -1 ? [] : [process.argv[replicaofIdx + 1], process.argv[replicaofIdx + 2]]

console.log(process.argv)

const isMaster = masterInfo.length == 0

function generateRandomString(length) {
   let result = '';
   const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   const charactersLength = characters.length;
   
   for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   
   return result;
}

const storage = {
   isMaster: isMaster,
   replicas: [],
   replicaIncrId: 0,
   master_replid: generateRandomString(40),
   master_repl_offset: 0,
   isResyncMode: false,
   isSyncMode: false
}

let SYNC_STAGE = 1

if(isMaster){
   reader.read(handler, storage)
}
else if(masterInfo.length != 2){
   process.exit()
}
else{
   const client = net.createConnection({host: masterInfo[0], port: masterInfo[1]})

   client.write(`*1\r\n$4\r\nPING\r\n`)
   console.log("ping commited")

   //client.write(`*3\r\n$8\r\nREPLCONF\r\n$14\r\nlistening-port\r\n$4\r\n${masterInfo[1]}\r\n`)
   //console.log("port set")

   //client.write(`*3\r\n$8\r\nREPLCONF\r\n$4\r\ncapa\r\n$6\r\npsync2\r\n`)
   //console.log("replication capabilities set")
   
   //client.write(`*3\r\n$5\r\nPSYNC\r\n$1\r\n?\r\n$2\r\n-1\r\n`);
   //console.log("resync begun")
   //storage.isResyncMode = true

   client.on('data', data => {
      /*
      if(storage.isResyncMode){
         handler.handleResync(storage, data.toString())
      }
      else{
         handler.handleCommand(data.toString(), storage, false, false, undefined, true)
      }
      */
      
      if(SYNC_STAGE == 1){
         if(data.toString() == encoder.encodeString("PONG")){
            SYNC_STAGE = 2
            client.write(`*3\r\n$8\r\nREPLCONF\r\n$14\r\nlistening-port\r\n$4\r\n${masterInfo[1]}\r\n`)
            console.log("port set")
         }
         else{
            process.exit()
         }
      }
      else if(SYNC_STAGE == 2){
         if(encoder.encodeString("OK") == data.toString()){
            SYNC_STAGE = 3
            client.write(`*3\r\n$8\r\nREPLCONF\r\n$4\r\ncapa\r\n$6\r\npsync2\r\n`)
            console.log("replication capabilities set")
         }
         else{
            process.exit()
         }
      }
      else if(SYNC_STAGE == 3){
         if(encoder.encodeString("OK") == data.toString()){
            SYNC_STAGE = 4
            client.write(`*3\r\n$5\r\nPSYNC\r\n$1\r\n?\r\n$2\r\n-1\r\n`);
            console.log("resync begun")
         }
         else{
            process.exit()
         }
      }
      else{
         try{
            let commandString = data.toString()
            //connection.write(handler.handleCommand(data.toString(), storage, true, storage.isResyncMode, connection, false))
   
            let index = 0;
            let parts = commandString.split(CRLF)
   
            while (index <= parts.length && commandString.length != 0){
               if(parts[index][0] != "*"){
                  const resyncRegex = /\+FULLRESYNC.*/g

                  storage.isResyncMode = true

                  index++
                  continue
               }

               const nextIndex = (parseInt(parts[index][1]) * 2 + index) + 1
   
               const command = parts.slice(index, nextIndex).join(CRLF) + (nextIndex < parts.length ? CRLF : "");
   
               console.log(index, nextIndex, parts.length)
   
               if (command.length == 0){
                  break
               }
   
               handler.handleCommand(command, storage, true, storage.isResyncMode, undefined, true)
   
               index = nextIndex
            }
            storage.isResyncMode = false
         }
         catch(err){
            console.log(err.message)
         }
      }
   });

   client.on("close", () => {
      client.end();
   })

   client.on("end", () => {
      console.log("connection ended")
      process.exit()
   })

   client.on("error", () => {
      console.log("error occurred")
      process.exit()
   })
}

if (storage["DB_0"] == undefined && storage.isMaster){
   handler.handleCommand("*2"+CRLF+"$6"+CRLF+"SELECT"+CRLF+"$1"+CRLF+"0"+CRLF, storage)
}

console.log("Server started")

const server = net.createServer((connection) => {
   connection.on("data", (data) => {
      try{
         let commandString = data.toString()
         //connection.write(handler.handleCommand(data.toString(), storage, true, storage.isResyncMode, connection, false))

         let index = 0;
         let parts = commandString.split(CRLF)

         while (index <= parts.length && commandString.length != 0){
            const nextIndex = (parseInt(parts[index][1]) * 2 + index) + 1

            const command = parts.slice(index, nextIndex).join(CRLF) + (nextIndex < parts.length ? CRLF : "");

            console.log(index, nextIndex, parts.length)

            if (command.length == 0){
               break
            }

            connection.write(handler.handleCommand(command, storage, true, storage.isResyncMode, connection, false))

            index = nextIndex
         }
      }
      catch(err){
         console.log("Writing error: " + err.message)
      }
   });

   connection.on("close", () => {
      connection.end();
   })

   connection.on("end", () => {
      console.log("connection ended")
   })

   connection.on("error", () => {
      console.log("error occurred")
      connection.end()
   })
});

server.listen(PORT, "127.0.0.1");