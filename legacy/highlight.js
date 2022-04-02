let Highlight = (function(){
	let Highlight = {lang:{}}
	
	//keywords that don't have an expression after them
	var keywords=[
		"BREAK","COMMON","CONTINUE","ELSE","END","ENDIF","REM","REPEAT","THEN","WEND",
	]
	var keywords_sb3=[
		"STOP"
	]
	var keywords_sb4=[
		"OTHERWISE","ENDCASE","LOOP","ENDLOOP"
	]
	//keywords w/ expression after them (or other special thing)
	var argKeywords=[
		"CALL","DATA","DEC","DIM","ELSEIF","EXEC","FOR","GOSUB","GOTO","IF","INC","INPUT","LINPUT","NEXT","ON","OUT","PRINT","READ","RESTORE","RETURN","SWAP","UNTIL","USE","VAR","WHILE",
	]
	var argKeywords_sb4=[
		"CASE","WHEN","DEFOUT","TPRINT","CONST","ENUM",
	]
	var builtinFunctions=[
		"ABS","ACCEL","ACLS","ACOS","ARYOP","ASC","ASIN","ATAN","ATTR","BACKCOLOR","BEEP","BGMCHK","BGMCLEAR","BGMCONT","BGMPAUSE","BGMPLAY","BGMSET","BGMSETD","BGMSTOP","BGMVAR","BGMVOL","BIN$","BIQUAD","BQPARAM","BREPEAT","BUTTON","CEIL","CHKCALL","CHKCHR","CHKFILE","CHKLABEL","CHKMML","CHKVAR","CHR$","CLASSIFY","CLIPBOARD","CLS","COLOR","CONTROLLER","COPY","COS","COSH","DEG","DELETE","DIALOG","DTREAD","EFCSET","EFCWET","EXP","FADE","FADECHK","FFT","FFTWFN","FILES","FILL","FLOOR","FORMAT$","GBOX","GCIRCLE","GCLIP","GCLS","GCOLOR","GCOPY","GFILL","GLINE","GLOAD","GPAINT","GPSET","GPUTCHR","GSAVE","GTRI","GYROA","GYROSYNC","GYROV","HEX$","IFFT","INKEY$","INSTR","KEY","LEFT$","LEN","LOAD","LOCATE","LOG","MAX","MID$","MIN","OPTION","PCMCONT","PCMSTOP","PCMSTREAM","PCMVOL","POP","POW","PRGDEL","PRGEDIT","PRGGET$","PRGINS","PRGNAME$","PRGSET","PRGSIZE","PROJECT","PUSH","RAD","RANDOMIZE","RENAME","RGB","RIGHT$","RINGCOPY","RND","RNDF","ROUND","RSORT","SAVE","SCROLL","SGN","SHIFT","SIN","SINH","SNDSTOP","SORT","SPANIM","SPCHK","SPCHR","SPCLR","SPCOL","SPCOLOR","SPCOLVEC","SPDEF","SPFUNC","SPHIDE","SPHITINFO","SPHITRC","SPHITSP","SPHOME","SPLINK","SPOFS","SPPAGE","SPROT","SPSCALE","SPSET","SPSHOW","SPSTART","SPSTOP","SPUNLINK","SPUSED","SPVAR","SQR","STICK","STR$","SUBST$","TALK","TALKCHK","TALKSTOP","TAN","TANH","TMREAD","TOUCH","UNSHIFT","VAL","VSYNC","WAIT","WAVSET","WAVSETA","XSCREEN",
		//BIG+SB4
		"VIBRATE",
	]
	var builtinFunctions_sb3=[
		"BACKTRACE","BGANIM","BGCHK","BGCLIP","BGCLR","BGCOLOR","BGCOORD","BGCOPY","BGFILL","BGFUNC","BGGET","BGHIDE","BGHOME","BGLOAD","BGOFS","BGPAGE","BGPUT","BGROT","BGSAVE","BGSCALE","BGSCREEN","BGSHOW","BGSTART","BGSTOP","BGVAR","BGMPRG","BGMPRGA","DISPLAY","DLCOPEN","EFCOFF","EFCON","FONTDEF","GOFS","GPAGE","GPRIO","GSPOIT","MICDATA","MICSAVE","MICSTART","MICSTOP","MPEND","MPGET","MPNAME$","MPRECV","MPSEND","MPSET","MPSTART","MPSTAT","STICKEX","RGBREAD","SPCLIP","VISIBLE","WIDTH","XOFF","XON",
		//BIG
		"GPUTCHR16",
	]
	var builtinFunctions_sb4=[
		"PCMPOS","TYPEOF","ARRAY#","ARRAY%","ARRAY$","RESIZE","INSERT","REMOVE","INSPECT","DEFARGC","DEFARG","DEFOUTC","INT","FLOAT","LAST","FONTINFO","PERFBEGIN","PERFEND","SYSPARAM","METAEDIT","METALOAD","METASAVE","XCTRLSTYLE","MOUSE","MBUTTON","IRSTART","IRSTOP","IRSTATE","IRREAD","IRSPRITE","KEYBOARD","TCPIANO","TCHOUSE","TCROBOT","TCFISHING","TCBIKE","TCVISOR","LOADG","LOADV","SAVEG","SAVEV","ANIMDEF","TSCREEN","TPAGE","TCOLOR","TLAYER","TPUT","TFILL","THOME","TOFS","TROT","TSCALE","TSHOW","THIDE","TBLEND","TANIM","TSTOP","TSTART","TCHK","TVAR","TCOPY","TSAVE","TLOAD","TARRAY","TUPDATE","TFUNC","GTARGET","RGBF","HSV","GPGET","GARRAY","GUPDATE","GSAMPLE","SPLAYER","STOP","LAYER","LMATRIX","LFILTER","LCLIP","BEEPPIT","BEEPPAN","BEEPVOL","BEEPSTOP","BGMPITCH","BGMWET","EFCEN","SNDMSBAL","SNDMVOL","PRGSEEK","XSUBSCREEN","ENVSTAT","ENVTYPE","ENVLOAD","ENVSAVE","ENVINPUT$","ENVFOCUS","ENVPROJECT","ENVLOCATE","PUSHKEY","HELPGET","HELPINFO","UISTATE","UIMASK","UIPUSHCMPL","DATE$","TIME$","RESULT","CALLIDX","FREEMEM","MILLISEC","MAINCNT",
	]
	//SB3 only
	var systemVariables=[
		"CALLIDX","CSRX","CSRY","CSRZ","DATE$","ERRLINE","ERRNUM","ERRPRG","EXTFEATURE","FREEMEM","HARDWARE","MAINCNT","MICPOS","MICSIZE","MILLISEC","MPCOUNT","MPHOST","MPLOCAL","PCMPOS","PRGSLOT","RESULT","SYSBEEP","TABSTEP","TIME$","VERSION"
	]
	
	function isAlpha(c){
		return c>='A'&&c<='Z'||c>='a'&&c<='z'
	}
	
	function isDigit(c){
		return c>='0'&&c<='9'
	}
	
	//token types:
	//"linebreak"  - line break
	//"function"   - function call
	//"operator"   - operators, including word operators
	//"name"       - function name (after DEF keyword)
	//"equals"     - = assignment operator
	//"expr"       - ; or , or ( or [
	//"noexpr"     - : or ) or ]
	//"whitespace" - space or tab
	//"variable"   - variable
	//"number"     - number literal (including TRUE/FALSE)
	//"def"        - DEF keyword
	//"string"     - strings (including label strings)
	//"word"       - unknown word (resolved to "function", "operator", "name", "variable", "def", "argkeyword", or "keyword")
	//"label"      - unknown label/labelstring (resolved to "label" or "string"), or label (not label string)
	//"argkeyword" - keyword with expression after it
	//"keyword"    - keyword that doesn't have an expression after it
	
	function isInExpr(type){
		return type=="argkeyword"||type=="function"||type=="operator"||type=="name"||type=="equals"||type=="expr"
	}
	
	function main(code, callback, sb4){
		var i=-1,c
		function next(){
			i++
			c=code.charAt(i)
		}

		function jump(pos){
			i=pos-1
			next()
		}
		
		var prev=0
		var prevType="start"
		
		//=================//
		// Process a token //
		//=================//
		function push(type, cssType){
			var word=code.substring(prev,i)
			prev=i
			//Check words
			if(type=="word"){
				var upper=word.toUpperCase()
				//True/False
				if(sb4!=true && (upper=="TRUE"||upper=="FALSE")){
					type="number"
					cssType="true-false number"
				//operators
				}else if(upper=="DIV"||upper=="MOD"||upper=="AND"||upper=="OR"||upper=="XOR"||upper=="NOT"){
					type="operator"
					cssType="word-operator operator"
				//DEF
				}else if(upper=="DEF"){
					type="def"
					cssType="def keyword"
				//T? TPRINT
				}else if(sb4!=false && (upper=="T" && c=='?')){
					word+=c
					next()
					prev=i
					type="keyword"
					cssType="keyword"
				//keywords without an expression after them
				}else if(keywords.indexOf(upper)>=0 || sb4==false && keywords_sb3.indexOf(upper)>=0 || sb4!=false && keywords_sb4.indexOf(upper)>=0){
					type="keyword"
					cssType="keyword"
				//keywords w/ and expression after
				}else if(argKeywords.indexOf(upper)>=0 || sb4!=false && argKeywords_sb4.indexOf(upper)>=0){
					type="argkeyword"
					cssType="keyword"
				//User-defined function name
				}else if(prevType=="def"){
					type="name"
					cssType="name"
				//Variable, function, TO/STEP, etc.
				}else{
					var fPos=i
					while(c==' ' || c=='\t')
						next()
					var isFunc=false
					if(isInExpr(prevType)){
						if(c=="(")
							isFunc=true
					}else{
						isFunc=true
						if(c=="["){
							isFunc=false
						}else if(c=="="){
							next()
							if(c!="=")
								isFunc=false
						}
					}
					if(isFunc){
						type="function"
						if(builtinFunctions.indexOf(upper)!=-1 || sb4!=true && builtinFunctions_sb3.indexOf(upper)!=-1 || sb4!=false && builtinFunctions_sb4.indexOf(upper)!=-1)
							cssType="statement function"
						else if(upper=="TO" || upper=="STEP")
							cssType="to-step keyword"
						else
							cssType="statement"
					}else{
						type="variable"
						if(sb4!=true && systemVariables.indexOf(upper)!=-1)
							cssType="variable function"
						else
							cssType="variable"
					}
					jump(fPos)
				}
			//Check labels
			}else if(type=="label"){
				if(isInExpr(prevType)){
					type="string"
					cssType="label-string string"
				}else{
					cssType="label"
				}
			//Use type as csstype if not specified
			}else{
				if(cssType==undefined)
					cssType=type
			}
			//pass to callback function
			callback(word,cssType)
			//store previous non-whitespace token type
			if(type!="whitespace")
				prevType=type
		}
		
		next()
		
		//loop until the end of the string
		while(c){
			//
			//keywords, functions, variables
			//
			if(isAlpha(c)||c=='_'){
				next()
				//read name
				while(isAlpha(c)||isDigit(c)||c=='_')
					next()
				//read type suffix
				if(c=='#'||c=='%'||c=='$')
					next()
				//push word type
				push("word")
			//
			//numbers
			//
			}else if(isDigit(c)||c=='.'){
				//if digit was found, read all of them
				while(isDigit(c))
					next()
				//if there's a decimal point
				if(c=='.'){
					next()
					//read digits after
					if(isDigit(c)){
						next()
						while(isDigit(c))
							next()
					}else{
						//if GOTO is available: GOTO @skip_e
						if(c=='#')
							next()
						push("number")
						continue
					}
				}
				//E notation
				if(c=='E'||c=='e'){
					var ePos=i
					next()
					//check for + or -
					if(c=='+'||c=='-')
						next()
					//read digits
					if(isDigit(c)){
						next()
						while(isDigit(c))
							next()
					//no digits (invalid)
					}else{
						jump(ePos)
						push()
						continue
					}
				}
				//(if GOTO is available: @skip_e)
				//read float suffix
				if(c=='#')
					next()
				push("number")
			//
			//strings
			//
			}else switch(c){
			case '"':
				next()
				//read characters until another quote, line ending, or end of input
				while(c && c!='"' && c!='\n' && c!='\r')
					next()
				//read closing quote
				if(c=='"')
					next()
				push("string")
			//
			//comments
			//
			break;case '\'':
				next()
				//read characters until line ending or end of input
				while(c && c!='\n' && c!='\r')
					next()
				push("comment")
			//
			//logical AND, hexadecimal, binary
			//
			break;case '&':
				next()
				switch(c){
				//logical and
				case '&':
					next()
					push("operator")
				//hexadecimal
				break;case 'H':case 'h':
					var hPos=i
					next()
					//read hexadecimal digits
					if(isDigit(c)||c>='A'&&c<='F'||c>='a'&&c<='f'|| (c=='_'&&sb4!=false)){
						next()
						while(isDigit(c)||c>='A'&&c<='F'||c>='a'&&c<='f'|| (c=='_'&&sb4!=false))
							next()
						push("number")
					}else{
						jump(hPos)
						push()
					}
				//binary
				break;case 'B':case 'b':
					var bPos=i
					next()
					//read hexadecimal digits
					if(c=='0'||c=='1'|| (c=='_'&&sb4!=false)){
						next()
						while(c=='0'||c=='1'|| (c=='_'&&sb4!=false))
							next()
						push("number")
					}else{
						jump(bPos)
						push()
					}
				//invalid &
				break;default:
					push()
				}
			//
			//labels
			//
			break;case '@':
				next()
				//read name
				while(isDigit(c)||isAlpha(c)||c=='_')
					next()
				//ok
				push("label")
			//
			//constants
			//
			break;case '#':
				next()
				//read name
				if(isDigit(c)||isAlpha(c)||c=='_'){
					next()
					while(isDigit(c)||isAlpha(c)||c=='_')
						next()
					//read type suffix
					if(c=='#'||c=='%'||c=='$')
						next()
					push("number","constant number")
				}else{
					//read type suffix
					if(c=='#'||c=='%'||c=='$'){
						next()
						push("number","constant number")
					}else{
						push()
					}
				}
			//
			//logical or
			//
			break;case '|':
				next()
				//logical or
				if(c=='|'){
					next()
					push("operator")
				//invalid
				}else{
					push()
				}
			//
			//less than, less than or equal, left shift
			//
			break;case '<':
				next()
				if(c=='='||c=='<') //<= <<
					next()
				push("operator")
			//
			//greater than, greater than or equal, right shift
			//
			break;case '>':
				next()
				if(c=='='||c=='>') //>= >>
					next()
				push("operator")
			//
			//equal, equal more
			//
			break;case '=':
				next()
				//==
				if(c=='='){
					next()
					push("operator")
				}else{
					push("equals")
				}
			//
			//logical not, not equal
			//
			break;case '!':
				next()
				if(c=='=') // !=
					next()
				push("operator")
			//
			//add, subtract, divide
			//
			break;case '+':case '-':case '/':
				next()
				push("operator")
			//
			//multiply or variadic parameter
			//
			break; case '*':
				next()
				if (isInExpr(prevType))
					push('operator')
				else
					push('variable', 'variable parameter')
			//
			// Line continuation (SB4)
			//
			break;case '\\':
				next()
				if (sb4==false) {
					push(undefined,false)
				} else {
					while (c && c!='\n' && c!='\r')
						next()
					next()
					push("whitespace")
				}
			
			//
			//other
			//
			
			break;case ';':case ',':case '[':case '(':
				next()
				push("expr",false)
			break;case '\n':
				next()
				push("linebreak",false)
			break;case ":":case ")":case "]":
				next()
				push("noexpr",false)
			break;case " ":case "\t":
				next()
				push("whitespace",false)
			break;case '?':
				next()
				push("argkeyword","question keyword")
			break;default:
				next()
				push(undefined,false)
			}
		}
		push("eof")
	}

	Highlight.lang.sb = function(code, callback) { return main(code, callback) }
	Highlight.lang.sb3 = function(code, callback) { return main(code, callback, false) }
	Highlight.lang.sb4 = function(code, callback) { return main(code, callback, true) }
	
	
	// todo: optimize this so longer sequences of unhighlighted chars are handled more efficiently
	
	Highlight.none = function(code, callback) {
		callback(code)
	}
	
	Highlight.cLike = function(code, callback) {
		var i=-1,c
		var prev=0
		
		function next(){
			i++
			c=code.charAt(i)
		}
		function push(type) {
			var word=code.substring(prev,i)
			prev=i
			if (type=='word') {
				if (['if','while','for','switch','case','return','do','break','continue','else'].indexOf(word) >= 0)
					type = 'keyword'
				else
					type = 'variable'
			}
			callback(word, type)
		}
		
		next()
		while(c){
			if (c=="/") {
				next()
				if (c=="/") {
					next()
					while (c && c!="\n")
						next()
					push('comment')
				} else {
					push()
				}
			} else if (c=='"') {
				next()
				while (c && c!="\n" && c!='"')
					next()
				if (c=='"')
					next()
				push('string')
			} else if (c=="'") {
				next()
				while (c && c!="\n" && c!="'")
					next()
				if (c=="'")
					next()
				push('string')
			} else if (isAlpha(c) || c=="_" || c=="$") {
				next()
				while (isAlphaNum(c) || c=="_" || c=="$")
					next()
				push('word')
			} else {
				next()
				push()
			}
		}
		
		function isAlpha(c) {
			return c>="A" && c<="Z" || c>="a" && c<="z"
		}
		function isAlphaNum(c) {
			return c>="A" && c<="Z" || c>="a" && c<="z" || c>="0" && c<="9"
		}
	}
	
	// list of every programming language
	;['c','js','javascript'].forEach(function(lang){
		Highlight.lang[lang] = Highlight.cLike
	})
	
	Highlight.highlight = function(text, lang) {
		if (lang)
			var hl = Highlight.lang[lang.toLowerCase()]
		
		hl = hl || Highlight.none
		
		var doc = document.createDocumentFragment()
		
		var prev = NaN
		var buffer = ""
		function callback(word, cls) {
			if (cls == prev) {
				buffer += word
				return
			}
			var element = document.createElement('span')
			element.textContent = buffer
			if (prev)
				element.className = prev
			doc.appendChild(element)
			prev = cls
			buffer = word
		}
		
		hl(text, callback)
		callback("", NaN)
		
		return doc
	}
	
	return Highlight
})()
