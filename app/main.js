const handler = require("./handler").handler;
const reader = require("./aof").reader
const net = require("net");
const CRLF = "\r\n" 

const portIdx = process.argv.indexOf("--port")
const PORT = portIdx == -1 ? 6379 : process.argv[portIdx + 1]

const replicaofIdx = process.argv.indexOf("--replicaof")
const masterInfo = replicaofIdx == -1 ? "" : process.argv[replicaofIdx + 1]

const isMaster = masterInfo.length == 0

const storage = {isMaster: isMaster}

reader.read(handler, storage)
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
         console.log("Writing error:" + err.message)
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