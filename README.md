# Streamie #

To try out Streamie go to <http://streamie.org>

For hacking on Streamie, see: <http://www.nonblocking.io/2010/08/future-is-here-i-just-forked-running.html>

## Setup ##

* `sudo sh deps`
* Go to [dev.twitter.com](http://dev.twitter.com/) and get oAuth secrets for local.streamie.org
* `cd lib/`
* `mkdir data`
* `node server.js USAGE`
** e.g. node server.js local.streamie.org:8888 YOURKEY YOURSECRET 8888
* Edit your /etc/hosts file and map local.streamie.org to 127.0.0.1
* <http://local.streamie.org:8888/>
* Now post anything, favorite, etc. Comes up almost before the UI finishes processing.
