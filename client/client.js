const encoder = require('../resp/encoder');
const CRLF = "\r\n"

const net = require('net');

const serverHost = '127.0.0.1';
const serverPort = 6379;

const client = new net.Socket();

client.connect(serverPort, serverHost, () => {
    console.log('Connected to server');
});

client.on('data', data => {
    console.log(data.toString());
});

process.stdin.on('data', data => {
    client.write(encoder.encoder.encodeCommand(data.toString())); //.replace(new RegExp(CRLF, 'g'), '')
});

client.on('close', () => {
    console.log('Connection closed');
});

client.on("end", () => {
    process.exit()
})

client.on("error", () => {
    console.log("error occurred")
})