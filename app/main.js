const handler = require("./handler").handler;
const reader = require("./aof").reader
const net = require("net");
const CRLF = "\r\n" 

const portIdx = process.argv.indexOf("--port")
const PORT = portIdx == -1 ? 6379 : process.argv[portIdx + 1]

const replicaofIdx = process.argv.indexOf("--replicaof")
const masterInfo = replicaofIdx == -1 ? [] : process.argv[replicaofIdx + 1].split(" ")

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
   master_repl_offset: 0
}

if(isMaster){
   reader.read(handler, storage)
}
else if(masterInfo.length != 2){
   process.exit()
}
else{
   const client = net.createConnection({host: masterInfo[0], port: masterInfo[1]})

   client.write(`*1\r\n$4\r\nPING\r\n`)

   client.write(`*3\r\n$8\r\nREPLCONF\r\n$14\r\nlistening-port\r\n$4\r\n${masterInfo[1]}\r\n`)
   client.write(`*3\r\n$8\r\nREPLCONF\r\n$4\r\ncapa\r\n$6\r\npsync2\r\n`)
   
   client.write(`*3\r\n$5\r\nPSYNC\r\n$1\r\n?\r\n$2\r\n-1\r\n`);
}

if (storage["DB_0"] == undefined){
   handler.handleCommand("*2"+CRLF+"$6"+CRLF+"SELECT"+CRLF+"$1"+CRLF+"0"+CRLF, storage)
}

console.log("Server started")

const server = net.createServer((connection) => {
   connection.on("data", (data) => {
      try{
         connection.write(handler.handleCommand(data.toString(), storage))
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
   })
});

server.listen(PORT, "127.0.0.1");