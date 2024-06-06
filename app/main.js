const handler = require("./handler").handler;
const net = require("net");

const storage = {}

const server = net.createServer((connection) => {
   connection.on("data", (data) => {
      connection.write(handler.handleCommand(data.toString(), storage))
   });
});

server.listen(6379, "127.0.0.1");