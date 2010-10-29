/**
 * Some postprocessing to workaround google translate
 * - google translate issue
 *   - it changes symbols
 *   - "#supertag" => "# supertag"
 *   - "@supername" => "@ supername"
 *   - "https://github.com" => "https: / / github.com" with the spaces.
 *     - but http://github.com" works... not too webby :)
 * - apparently, cant escape words from translation
*/
var gTranslateProc	= function(srcText){
	var REs	= {
		grubberUrl	: /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/ig,
		screenHash	: /[@#]\w+/g
	}
	var NOTRANSLATE	= "DONOTTRANSLATE_";
	var matches	= {};
	var preProcess		= function(text, key){
		var srcMatch	= matches[key]	= text.match(REs[key]);
		var tmp		= text;
		for(var i = 0; srcMatch && i < srcMatch.length; i++){
			tmp	= tmp.replace(srcMatch[i], NOTRANSLATE+key);
		}
		return tmp;
	}
	var postProcess		= function(text, key){
		var pattern	= NOTRANSLATE+key;
		var srcMatch	= matches[key];
		// see if some NOTRANSLATE are to be replaced
		var resMatch	= text.match(new RegExp(pattern, 'g'));
		if( !resMatch )	return text;
		// log to debug
		console.assert(srcMatch.length == resMatch.length);
		// replace each instance
		var dstText	= text;
		for(var i = 0; resMatch && i < resMatch.length; i++){
			dstText	= dstText.replace(pattern, srcMatch[i]);
		}
		// return resulting text
		return dstText;		
	}
	// preprocess srcText with the REs	
	var midText	= srcText;
	for(var key in REs){
		midText= preProcess(midText, key)
	}

	// to process the result
	var doProcessResult	= function(resText){
		// postprocess resText with the REs	
		var dstText	= resText;
		for(var key in REs){
			dstText	= postProcess(dstText, key)
		}
		// return resulting text
		return dstText;		
	}

	return {
		prepared_text	: midText,
		process_result	: doProcessResult
	}
}


//if( true ){
//	var srcText	= "@bonjour, les amis #love https://github.com slota";
//	srcText	= "Featuring Socially https://github.com Positive partner @VideoVolunteers 'Telling the Untold' http://bit.ly/bmLBnP #nonprofits #filmmaking #socialcause";
//	var gtranslate_proc	= new gTranslateProc(srcText);
//	console.log("prepared text="+ gtranslate_proc.prepared_text);
//	console.log("processed result="+gtranslate_proc.process_result(gtranslate_proc.prepared_text));
//}
