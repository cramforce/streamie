var cookie = {

    /*
     * Retrieve a cookie called $name
     */
    // Extremely ugly code that seems to work follows. a more robust replacement is more that welcome
    get: function(name) {

        var dc = document.cookie;


        var prefix = name + "=";
        var begin = dc.indexOf("; " + prefix);
        if (begin == -1) {
            begin = dc.indexOf(prefix);
            if (begin != 0) return "";
            // Wenn der Name (Prefix) ohne vorgestelltes ; nicht am Zeilenanfang steht, dann ist er Teil eines anderen Cookies und somit nicht was wir suchen.
        } else {
            begin += 2
            // Plus 2 damit der Index nicht mehr auf dem ; steht
        }
        var end = document.cookie.indexOf(";", begin);
        if (end == -1) {
            // Wenn kein ; vorhanden ist, dann handelt es sich um den letzten Wert im Cookie-String. Somit ist das Ende des Cookie-Strings auch gleich das ende des gesuchten Wertes.
            end = dc.length;
        }
        var value = unescape(dc.substring(begin + prefix.length, end));
        // Der Wert des gesuchten Cooki wird als Teilstring aus dem gesamten Cookie-Strings extrahiert.
        if (value == ";") {
            // bug with IE
            return ""
        }

        return value;
    },


    /*
	     * Set a cookie with name and value
	     * expires must be a Date-Object
	     */
    set: function(name, value, expires, secure) {

        var cookie = name + "=" + escape(value) +
        ((expires) ? "; expires=" + expires.toGMTString() : "") +
        //((path) ? "; path=" + path : "") +
        "; path=/" +
        ((secure) ? "; secure": "");

        document.cookie = cookie;

    }
};