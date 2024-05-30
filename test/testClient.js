const net = require('net');

const client = new net.Socket();

const message = 'Hello, world!';

client.connect(6379, '127.0.0.1', () => {
  client.write('*1\r\n$4\r\nPING\r\n');

  const command = `*2\r\n$4\r\nECHO\r\n$${message.length}\r\n${message}\r\n`;
  client.write(command);
  
  client.destroy();
});

client.on('data', (data) => {
    console.log(data.toString());
});