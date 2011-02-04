# Streamie #

To try out Streamie go to <http://streamie.org>

For hacking on Streamie, see: <http://www.nonblocking.io/2010/08/future-is-here-i-just-forked-running.html>

## Setup ##

* use node.js version 0.2.x
* `sudo sh deps`
* Go to [dev.twitter.com](http://dev.twitter.com/) and get oAuth secrets for local.streamie.org
* `cp config.sample.json config.json` and edit config.json
* `cd lib/`
* `mkdir data`
* `node server.js`
* Edit your /etc/hosts file and map streamie.com to 127.0.0.1
* <http://streamie.com:8888/>
* Now post anything, favorite, etc. Comes up almost before the UI finishes processing.
