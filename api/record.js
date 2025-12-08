const express = require('express');
const fs = require('fs');
const app = express();

app.post('/upload', function(req, res) {
  let writeStream = fs.createWriteStream('output.ogg');
  req.pipe(writeStream);

  req.on('end', function() {
    res.status(200).send('File uploaded and saved.');
  });
});

app.listen(3300, function() {
  console.log('Server listening on port 3000');
});


const fileStream = fs.createWriteStream('output.ogg');
const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function(ws) {
console.log('swwwwwwwwwwwww');
  ws.on('message', function(message) {
console.log('message')
    fileStream.write(Buffer.from(new Int16Array(message)));
  });
});