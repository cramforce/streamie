# Streamie #

To try out Streamie go to <http://streamie.org>

For hacking on Streamie, see: <http://www.nonblocking.io/2010/08/future-is-here-i-just-forked-running.html>

## Setup ##

* `npm install socket.io`
* `npm install oauth`
* `npm install node-static`
* `npm install nStore`
* `npm install http-proxy`
* `git submodule init`
* `git submodule update`
* Go to [dev.twitter.com](http://dev.twitter.com/) and get oAuth secrets
* `cd lib/`
* `mkdir data`
* `node server.js USAGE`
** e.g. node server.js localhost:8888 YOURKEY YOURSECRET 8888
* <http://localhost:8888/>
* Now post anything, favorite, etc. Comes up almost before the UI finishes processing.
