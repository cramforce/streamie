# Streamie #

For hacking on Streamie, see: http://www.nonblocking.io/2010/08/future-is-here-i-just-forked-running.html

## Setup ##

* npm install socket.io 
* npm install oauth
* npm install node-static 
* npm install nStore
* npm install node-proxy
* REPL node> (new Buffer("twitterusername:password")).toString("base64");
* cd lib/
* mkdir data
* node server.js [AuthHeaderValue]
* http://localhost:8888
* Now post anything, favorite, etc. Comes up almost before the UI finishes processing.

