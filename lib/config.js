
/* Streamie configuration 

Sample:

{
  "hostNameAndOptionalPort": "streamie.com:8888",
  "oauthKey": "asfsadgsadgsdfg",
  "oauthSecret": "sdfgsdfgsdfgsdfgsdfg",
  "port": "8888",
  "imgurKey": "sdfgsdfgsdfg", // Optional
  "staticFilesExpireSeconds": 0,
  "siteStreamOAuthToken": "efasdfasdf" // Optional
}

*/



function init() {
  var filename = __dirname+"/../config.json";
  var text = require("fs").readFileSync(filename);
  if(!text) {
    throw new Error("Couldn't read config file "+filename);
  }
  var obj = JSON.parse(text);
  console.log("Successfully read and parsed config file \n"+JSON.stringify(obj, null, " ")+"\n");
  return obj;
}

exports.config = init();