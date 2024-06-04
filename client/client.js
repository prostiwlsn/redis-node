const encoder = require('../resp/encoder');

const net = require('net');

const serverHost = '127.0.0.1';
const serverPort = 6379;

const client = new net.Socket();

client.connect(serverPort, serverHost, () => {
    console.log('Connected to server');
});

client.on('data', data => {
    console.log('Received: ' + data);
});

process.stdin.on('data', data => {
    client.write(Encoder.encodeCommand(data.toString()));
});

client.on('close', () => {
    console.log('Connection closed');
});