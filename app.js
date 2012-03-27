var http=require('http');
var url=require('url');
var fs=require('fs');
var irc=require('irc');
var socket=require('socket.io');

function incomingRequest(req, res) {
  "use strict";
  var urlp=url.parse(req.url);
  fs.readFile('files/'+urlp.pathname, function(err, data) {
    if(err) {
      res.writeHead(404, 'Not found!');
    } else {
      res.write(data);
    }
    res.end();
  });
}

function configureIO(socket) {
  "use strict";
  socket.set('transports', [
    'xhr-polling'
  ]);
  socket.loglevel = 5;
  socket.enable('browser client minification');
  socket.enable('broser client gzip');
}

var app = http.createServer(incomingRequest);
var io=socket.listen(app);
io.configure(function() {
  "use strict";
  configureIO(io);
});

function connected(socket) {
  "use strict";
  var is = {};

  socket.on('login', function(data) {
    is = new irc.Client(data.serverName, data.nickName, {
      channels: data.channels,
      autoRejoin: true,
      autoConnect: true,
      floodProtection: true
    });
    is.addListener('message', function(from, to, message) {
      socket.emit('message', { from: from, to: to, message: message });
    });
    is.addListener('registered', function(message) {
      socket.emit('registered', message);
    });
    is.addListener('motd', function(message) {
      socket.emit('motd', message);
    });
    is.addListener('join', function(channel, nick, message) {
      socket.emit('join', { channel: channel, nick: nick, message: message });
    });
    is.addListener('channellist', function(channels) {
      socket.emit('channellist', channels);
    });
    is.addListener('names', function(channel, names) {
      socket.emit('names', { channel: channel, names: names });
    });
    is.addListener('nick', function(oldnick, newnick, channel, message) {
      socket.emit('nick', { oldnick: oldnick, newnick: newnick, channel: channel, message: message });
    });
    is.addListener('part', function(channel, nick, reason, message) { 
      socket.emit('part', { channel: channel, nick: nick, reason: reason, message: message });
    });
    is.addListener('quit', function(nick, reason, channel, message) { 
      socket.emit('quit', { channel: channel, nick: nick, reason: reason, message: message });
    });
    is.addListener('error', function(err) {
      socket.emit('error', err);
    });
  });
  socket.on('message', function(data) {
    is.say(data.channel, data.message);
  });
  socket.on('list', function(data) {
    is.list();
  });
  socket.on('part', function(data) {
    is.part(data);
  });
  socket.on('msg', function(data) {
    is.say(data.user, data.message);
  });
  socket.on('names', function(data) {
    is.send('NAMES', data);
  });
  socket.on('nick', function(data) {
    is.send('NICK', data);
  });
  socket.on('join', function(data) {
    is.join(data);
  });
  socket.on('disconnect', function() {
    is.disconnect('leaving', function() {
      is = null;
    });
  });
}

io.sockets.on('connection', connected);

app.listen(process.env.VCAP_APP_PORT || 3443);
