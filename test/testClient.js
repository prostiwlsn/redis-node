const client = new net.Socket();

client.connect(6379, '127.0.0.1', () => {
  client.write('PING');
});