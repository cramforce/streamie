/**
* Some postprocessing to workaround google translate
* - google translate issue
*   - it changes symbols
*   - "nice domain .fr" => "nice domain. fr"
*   - "#supertag" => "# supertag"
*   - "@supername" => "@ supername"
*   - apparently, cant escape words from translation
*/
function twitter_gtranslate_pproc(src_text, dst_text){
       var result	= dst_text;

       // for @username and #tag
       var src_match	= src_text.match(/[@#]\w+/g);
       var dst_match	= dst_text.match(/[@#]\s+\w+/g);
       for(var i = 0; dst_match && i < dst_match.length; i++){
	       result	= result.replace(dst_match[i], src_match[i]);
       }
       
       // for ponctuation
       var src_match	= src_text.match(/ [.]\w+/g);
       var dst_match	= dst_text.match(/[.] \w+/g);
       console.dir(src_match);
       console.dir(dst_match);
       if( src_match && dst_match && src_match.length == dst_match.length ){
		for(var i = 0; dst_match && i < dst_match.length; i++){
			result	= result.replace(dst_match[i], " "+src_match[i]);
		}	
       }
       // return the just-built result
       return result;
}


var src_text	= "Comment faire le buzz sur les réseaux sociaux ?: Savoir buzzer sur les réseaux sociaux n'est pas simple. Heureusem... http://bit.ly/9ziKzc";
var dst_text	= "How the buzz on social networks?: Know buzz on social networks is not simple. Heureusem ... http://bit.ly/9ziKzc";
var result	= twitter_gtranslate_pproc(src_text, dst_text);

console.log("result", result);