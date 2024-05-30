const net = require("net");

const server = net.createServer((connection) => {
   connection.on("data", (data) => {
      //connection.write(data.toString());
    });
});

server.listen(6379, "127.0.0.1");