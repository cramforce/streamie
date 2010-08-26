var sys = require('sys')

var OAuth = require('oauth').OAuth;

/*
 * Initial request calls callback with cb(error, authURL, continueFunction)
 * Send the user to String, if he never allowed the application
 * cont takes a callback with the sig(error, request, response)
 */

exports.request = function (key, secret, oauth_callback_url, cb) {
  var oa = new OAuth("https://api.twitter.com/oauth/request_token",
                    "https://api.twitter.com/oauth/access_token",
                    key,
                    secret,
                    "1.0",
                    oauth_callback_url,
                    "HMAC-SHA1");
  
  oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
    if(error) cb('error :' + JSON.stringify(error))
    else { 
      sys.puts('oauth_token :' + oauth_token)
      sys.puts('oauth_token_secret :' + oauth_token_secret)
      sys.puts('requestoken results :' + sys.inspect(results))
      sys.puts("Requesting access token")
      sys.puts("http://api.twitter.com/oauth/authorize?oauth_token="+oauth_token);
      
      var cont = function (oauth_token_verifier, cb) {
        oa.getOAuthAccessToken(oauth_token, oauth_token_secret, oauth_token_verifier, function(error, oauth_access_token, oauth_access_token_secret, results2) {
          if(error) {
            cb("Request Error "+JSON.stringify(error))
          } else {
            sys.puts('oauth_access_token :' + oauth_access_token)
            sys.puts('oauth_token_secret :' + oauth_access_token_secret)
            sys.puts('accesstoken results :' + sys.inspect(results2))
            sys.puts("Requesting access token")
            var data= "";
            
            cb(null, function (url, method, cb) {
              var request = oa[method.toLowerCase()](url, oauth_access_token, oauth_access_token_secret)
              cb(null, request);
            });
          }
        });
      };
      
      cb(null, oauth_token, "http://api.twitter.com/oauth/authorize?oauth_token="+oauth_token, cont)
    }
  })
}