# twitter-steam-proxy #

This is based on a hack posted by @cramforce.

@dshaw


## Setup ##

* npm install socket.io 
* npm install oauth
* npm install node-static 
* REPL node> (new Buffer("twitterusername:password")).toString("base64"); 
* cd lib/
* node server.js [AuthHeaderValue]
* http://localhost:8888
* Now post anything, favorite, etc. Comes up almost before the UI finishes processing.


