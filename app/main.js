const handler = require("./handler").handler;
const net = require("net");
const CRLF = "\r\n"

const storage = {}

handler.handleCommand("*2"+CRLF+"$6"+CRLF+"SELECT"+CRLF+"$1"+CRLF+"0"+CRLF, storage)

console.log("Server started")

const server = net.createServer((connection) => {
   connection.on("data", (data) => {
      connection.write(handler.handleCommand(data.toString(), storage))
   });
});

server.listen(6379, "127.0.0.1");