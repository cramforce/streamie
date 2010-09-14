/**
 * Some postprocessing to workaround google translate
 * - google translate issue
 *   - it changes symbols
 *   - "nice domain .fr" => "nice domain. fr"
 *   - "#supertag" => "# supertag"
 *   - "@supername" => "@ supername"
 * - apparently, cant escape words from translation
*/
var gTranslateProc	= function(src_text){
	var NOTRANSLATE	= "DONOTTRANSLATE";
	// for @username and #tag
	var src_match	= src_text.match(/[@#]\w+/g);
	var mid_text	= src_text;
	for(var i = 0; src_match && i < src_match.length; i++){
		mid_text	= mid_text.replace(src_match[i], NOTRANSLATE);
	}

	// to process the result
	var do_process_result	= function(res_text){
		var res_match	= res_text.match(new RegExp(NOTRANSLATE, 'g'));
		var dst_text	= res_text;
		console.assert(src_match.length == res_match.length);
		for(var i = 0; res_match && i < res_match.length; i++){
			dst_text	= dst_text.replace(NOTRANSLATE, src_match[i]);
		}
		return dst_text;		
	}

	
	return {
		prepared_text	: mid_text,
		process_result	: do_process_result
	}
}


if( false ){
	var src_text	= "@bonjour, les amis #love";
	var gtranslate_proc	= new gTranslateProc(src_text);
	console.log("prepared text="+ gtranslate_proc.prepared_text);
	console.log("processed result="+gtranslate_proc.process_result(gtranslate_proc.prepared_text));
}
