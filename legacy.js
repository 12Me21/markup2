Markup.INJECT = Markup=>{
	"use strict"
	
	Markup.langs = {
		'12y2': Markup.parse,
		plaintext(text) {
			return {type: 'ROOT', content: [text]}
		},
	}
	
	Markup.convert_lang = function(text, lang='plaintext') {
		try {
			let parser = Markup.langs[lang] || Markup.langs.plaintext
			let tree = parser(text)
			return Markup.render(tree)
		} catch(e) {
			return Document.createTextNode(text) // todo: error msg + move this to render.js
		}
	}
	
	let Parse = {
		lang: {},
		options: null,
	}
	
	let BLOCKS = {
		text: {},
		lineBreak: {},
		line: {block: true}, // now we can remove the hack
		invalid: {},
		code: {block:true},
		icode: {},
		audio: {block:true},
		video: {block:true},
		youtube: {block:true},
		bg: {},
		root: {},
		bold: {},
		italic: {},
		underline: {},
		strikethrough: {},
		heading: {block:true},
		quote: {block:true},
		list: {block:true},
		item: {block:true},
		simpleLink: {},
		customLink: {},
		table: {block:true},
		row: {block:true},//not sure, only used internally so block may not matter
		cell: {},
		image: {block:true},
		error: {block:true},
		align: {block:true},
		superscript: {},
		subscript: {},
		anchor: {},
		spoiler: {block:true},
		ruby: {},
		bg: {},
	}
	
	/***********
	 ** STATE **
    ***********/
	var c,i,cache = null,code
	var editorCache = {video:{},audio:{},youtube:{}}
	var skipNextLineBreak
	var textBuffer
	var curr, output
	var openBlocks
	var stack
	var startOfLine
	var leadingSpaces
	var blocks
	function scan(){}
	
	function init(scanFunc, text) {
		scan = scanFunc
		code = text
		if (cache)
			for (type in cache)
				for (arg in cache[type])
					cache[type][arg].forEach(function(x){
						x.used = false
					})
		blocks = options//myBlocks
		openBlocks = 0
		leadingSpaces = 0
		startOfLine = true
		skipNextLineBreak = false
		textBuffer = ""
		output = curr = options.root()
		stack = [{node:curr, type:'root'}]
		stack.top = function() {
			return stack[stack.length-1]
		}
		restore(0)
	}
	// move to pos
	function restore(pos) {
		i = pos-1
		scan()
	}
	
	//try to read a char
	function eatChar(chr) {
		if (c == chr) {
			scan()
			return true
		}
	}
	
	function matchNext(str) {
		return code.substr(i, str.length) == str
	}
	
	// read a url
	// if `allow` is true, url is only ended by end of file or ]] or ][ (TODO)
	function readUrl(allow) {
		var start = i
		var depth = 0
		if (allow)
			while (c) {
				if (eatChar("[")) {
					depth++
				} else if (c=="]") {
					depth--
					if (depth<0)
						break
					scan()
				} else
					scan()
			}
		else {
			while (c) {
				if (/[-\w\$\.+!*',;/\?:@=&#%~]/.test(c)) {
					scan()
				} else if (eatChar("(")) {
					depth++
				} else if (c==")") {
					depth--
					if (depth < 0)
						break
					scan()
				} else
					break
			}
			var last = code[i-1]
			if (/[,\.?!:]/.test(last)) {
				i-=2
				scan()
			}
		}
		return code.substring(start, i)
	}
	
	/***********
    ** stack **
    ***********/
	function stackContains(type) {
		for (var i=0; i<stack.length; i++) {
			if (stack[i].type == type) {
				return true
			}
		}
		return false
	}
	function top_is(type) {
		var top = stack.top()
		return top && top.type == type
	}
	
	/****************
    ** outputting **
    ****************/
	function endBlock() {
		flushText()
		var item = stack.pop()
		if (item.node && item.isBlock)
			skipNextLineBreak = true
		
		if (stack.length) {
			var i=stack.length-1
			// this skips {} fake nodes
			// it will always find at least the root <div> element I hope
			while (!stack[i].node){
				i--
			}
			curr = stack[i].node
			openBlocks--
		} else {
			curr = null
		}
	}
	
	
	
	// output contents of text buffer
	function flushText() {
		if (textBuffer) {
			options.append(curr, options.text(textBuffer))
			textBuffer = ""
		}
	}
	
	// add linebreak to output
	// todo: skipping linebreaks should skip / *\n? */ (spaces before/after!)
	// so like [h1]test[/h1] [h2]test[/h2]
	// no extra linebreak there
	function addLineBreak() {
		if (skipNextLineBreak) {
			skipNextLineBreak = false
		} else {
			flushText()
			addBlock('lineBreak')
		}
	}
	
	// add text to output (buffered)
	function addText(text) {
		if (text) {
			textBuffer += text
			skipNextLineBreak = false
		}
	}
	
	// call at end of parsing to flush output
	function endAll() {
		flushText()
		while (stack.length)
			endBlock()
	}
	
	/*****************
    ** cache stuff **
    *****************/
	function findUnusedCached(cache, type, arg) {
		var list = cache[type][arg]
		if (!list)
			return null
		for (var i=0;i<list.length;i++) {
			if (!list[i].used)
				return list[i]
		}
		return null
	}
	
	// add simple block with no children
	function addBlock(type, arg, ext1, ext2) {
		flushText()
		var node = tryGetCached(cache, type, arg && arg[""], function() {
			return blocks[type](arg, ext1, ext2)
		})
		options.append(curr, node)
		if (BLOCKS[type].block)
			skipNextLineBreak = true
		else
			skipNextLineBreak = false
	}
	
	function startBlock(type, data, arg) {
		data.type = type
		if (type) {
			data.isBlock = BLOCKS[type].block
			openBlocks++
			if (openBlocks > options.maxDepth)
				throw "too deep nestted blocks"
			var node = tryGetCached(cache, type, arg && arg[""], function() {
				return blocks[type](arg)
			})
			data.node = node
			if (data.isBlock)
				skipNextLineBreak = true
			
			flushText()
			options.append(curr, node)
			curr = node
		}
		stack.push(data)
		return data
	}
	// check for /\b(http://|https://|sbs:)/ basically
	function isUrlStart() {
		if (code[i-1] && /\w/.test(code[i-1]))
			return false
		return matchNext("http://") || matchNext("https://") || matchNext("sbs:")
	}
	
	// try to get a node from cache.
	// will get nodes where `type` and `arg` matches
	// if not found, returns make(), and adds to cache
	function tryGetCached(cache, type, arg, make) {
		var node
		if (cache && type && cache[type]) {
			var item = findUnusedCached(cache, type, arg)
			if (item) {
				item.used = true
				node = item.node
			}
		}
		if (!node && type) {
			node = make()
			if (cache && cache[type]) {
				if (!cache[type][arg])
					cache[type][arg] = []
				cache[type][arg].push({node:node, used:true})
			}
		}
		return node
	}
	
	var options = Parse.options
	
	Markup.langs['12y'] = function(codeInput) {
		
		init(function() {
			if (c == "\n" || !c)
				lineStart()
			else if (c != " ")
				startOfLine = false
			else if (startOfLine)
				leadingSpaces++
			i++
			c = code.charAt(i)
		}, codeInput)
		
		var tags = {
			spoiler: "spoiler",
			ruby: "ruby",
			align: "align",
			sub: "subscript",
			sup: "superscript",
			anchor: "anchor",
			bg: "bg"
		}
		
		while (c) {
			if (eatChar("\n")) {
				endLine()
				//==========
				// \ escape
			} else if (eatChar("\\")) {
				if (c == "\n") {
					flushText()
					addBlock('lineBreak')
				} else
					addText(c)
				scan()
				//===============
				// { group start (why did I call these "groups"?)
			} else if (c == "{") {
				readEnv()
				//=============
				// } group end
			} else if (eatChar("}")) {
				if (stackContains(null)) {
					closeAll(false)
				} else {
					addText("}")
				}
				//================
				// * heading/bold
			} else if (c == "*") {
				if (startOfLine && (code[i+1] == "*" || code[i+1] == " ")) {
					var headingLevel = 0
					while (eatChar("*"))
						headingLevel++
					if (headingLevel > 3)
						headingLevel = 3
					
					if (eatChar(" "))
						startBlock('heading', {}, headingLevel)
					else
						addMulti('*', headingLevel)
				} else {
					doMarkup('bold', options.bold)
				}
			} else if (c == "/") {
				doMarkup('italic', options.italic)
			} else if (c == "_") {
				doMarkup('underline', options.underline)
			} else if (c == "~") {
				doMarkup('strikethrough', options.strikethrough)
				//============
				// >... quote
			} else if (startOfLine && eatChar(">")) {
				// todo: maybe >text should be a quote without author... 
				// need to add a way to add information to quotes:
				// - user ID
				// - post ID
				/*start = i
				while (eatChar(" "))
					
				while (c && !char_in(c, " \n{:"))
					scan()
				var name = code.substring(start, i).trim()
				eatChar(":")
				while (eatChar(" "))*/
				
				startBlock('quote', {}, {/*"":name*/})
				//==============
				// -... list/hr
			} else if (startOfLine && eatChar("-")) {
				textBuffer = "" //hack:
				//----------
				// --... hr
				if (eatChar("-")) {
					var count = 2
					while (eatChar("-"))
						count++
					//-------------
					// ---<EOL> hr
					if (c == "\n" || !c) { //this is kind of bad
						addBlock('line')
						//----------
						// ---... normal text
					} else {
						addMulti("-", count)
					}
					//------------
					// - ... list
				} else if (eatChar(" ")) {
					startBlock('list', {level:leadingSpaces}, {})
					startBlock('item', {level:leadingSpaces})
					//---------------
					// - normal char
				} else
					addText("-")
				//==========================
				// ] end link if inside one
			} else if (c == "]" && stack.top().inBrackets){ //this might break if it assumes .top() exists. needs more testing
				scan()
				if (stack.top().big) {
					if (eatChar("]"))
						endBlock()
					else
						addText("]")
				} else
					endBlock()
				//============
				// |... table
			} else if (c == "|") {
				var top = stack.top()
				// continuation
				if (top.type == 'cell') {
					scan()
					var row = top.row
					var table = top.row.table
					var eaten = eatChar("\n")
					//--------------
					// | | next row
					if (eaten && eatChar("|")) {
						// number of cells in first row
						// determines number of columns in table
						if (table.columns == null)
							table.columns = row.cells
						// end blocks
						endBlock() //cell
						if (top_is('row')) //always
							endBlock()
						// start row
						// calculate number of cells in row which will be
						// already filled due to previous row-spanning cells
						var cells = 0
						table.rowspans = table.rowspans.map(function(span){
							cells++
							return span-1
						}).filter(function(span){return span > 0})
						var row = startBlock('row', {table:table, cells:cells})
						row.header = eatChar("*")
						// start cell
						startCell(row)
						//--------------------------
						// | next cell or table end
					} else {
						row.cells++
						textBuffer = textBuffer.replace(/ *$/,"") //strip trailing spaces (TODO: allow \<space>)
						// end of table
						// table ends when number of cells in current row = number of cells in first row
						// single-row tables are not easily possible ..
						// TODO: fix single row tables
						if (table.columns != null && row.cells > table.columns) {
							endBlock() //end cell
							if (top_is('row')) //always
								endBlock() //row
							if (top_is('table')) //always
								endBlock() //table
							if (eaten)
								addLineBreak()
						} else { // next cell
							endBlock() //cell
							startCell(row)
						}
					}
					// start of new table (must be at beginning of line)
				} else if (startOfLine) {
					scan()
					table = startBlock('table', {
						columns: null,
						rowspans: []
					}, {})
					row = startBlock('row', {
						table: table,
						cells: 0
					})
					row.header = eatChar("*")
					startCell(row)
				} else {
					scan()
					addText("|")
				}
				//===========
				// `... code
			} else if (eatChar("`")) {
				//---------------
				// ``...
				if (eatChar("`")) {
					//----------------
					// ``` code block
					if (eatChar("`")) {
						// read lang name
						let start = i
						while (c && c!="\n" && c!="`")
							scan()
						//treat first line as language name, if it matches the pattern. otherwise it's code
						var language = code.substring(start, i)
						var eaten = false
						if (/^\s*\w*\s*$/.test(language)) {
							language = language.trim().toLowerCase()
							eaten = eatChar("\n")
							start = i
						}
						
						i = code.indexOf("```", i)
						addBlock('code', {"": language}, code.substring(start, i!=-1 ? i : code.length))
						skipNextLineBreak = eaten
						if (i != -1) {
							restore(i + 3)
						} else {
							restore(code.length)
						}
						//------------
						// `` invalid
					} else {
						addText("``")
					}
					// --------------
					// ` inline code
				} else {
					let start = i
					var codeText = ""
					while (c) {
						if (c=="`") {
							if (code[i+1] == "`") {
								if (i == start+1 && codeText[0] == " ")
									codeText = codeText.substr(1)
								scan()
							} else
								break
						}
						codeText += c
						scan()
					}
					addBlock('icode',{},codeText)
					scan()
				}
				//
				//================
				// link
			} else if (readLink()) {
				//
				//=============
				// normal char
			} else {
				addText(c)
				scan()
			}
		}
		// END
		endAll()
		return output.node

		function endAll() {
			flushText()
			while (stack.length) {
				endBlock()
			}
		}
		
		// ###################################
		
		function readBracketedLink(embed) {
			if (eatChar("[")) {
				if (eatChar("[")) {
					// read url:
					var start = i
					var after = false
					var url = readUrl(true)
					if (eatChar("]")) {
						if (eatChar("]")){
						}else if (eatChar("["))
							after = true
					}
					if (embed) {
						var type = urlType(url)
						var altText = null
						if (after) {
							altText = ""
							while (c) { //TODO: should this break on newline too?
								if (c==']' && code[i+1]==']') { //messy
									scan()
									scan()
									break
								}
								eatChar("\\")
								altText += c
								scan()
							}
						}
						addBlock(type, {"":url}, altText)
					} else {
						if (after)
							startBlock('customLink', {big: true, inBrackets: true}, {"":url})
						else
							addBlock('simpleLink', {"":url})
					}
					return true
				} else {
					addText("[")
				}
			}
			return false
		}
		
		function readEnv() {
			if (!eatChar("{"))
				return false
			startBlock(null, {})
			lineStart()
			
			var start = i
			if (eatChar("#")){
				var name = readTagName()
				var props = readProps()
				// todo: make this better lol
				var func = tags[name]
				if (func && !(name=="spoiler" && stackContains("spoiler"))) {
					startBlock(func, {}, props)
				} else {
					addBlock('invalid', code.substring(start, i), "invalid tag")
				}
				/*if (displayBlock({type:name}))
				  skipNextLineBreak = true //what does this even do?*/
			}
			lineStart()
			//	eatChar("\n")
			return true
		}
		
		// read table cell properties and start cell block, and eat whitespace
		// assumed to be called when pointing to char after |
		function startCell(row) {
			var props = {}
			if (eatChar("#"))
				Object.assign(props, readProps())
			
			if (props.rs)
				row.table.rowspans.push(props.rs-1)
			if (props.cs)
				row.cells += props.cs-1
			
			if (row.header)
				props.h = true
			
			startBlock('cell', {row: row}, props)
			while (eatChar(" ")){
			}
		}
		
		// split string on first occurance
		function split1(string, sep) {
			var n = string.indexOf(sep)
			if (n == -1)
				return [string, null]
			else
				return [string.substr(0,n), string.substr(n+sep.length)]
		}
		
		function readTagName() {
			var start = i
			while (c>="a" && c<="z") {
				scan()
			}
			if (i > start)
				return code.substring(start, i)
		}
		
		// read properties key=value,key=value... ended by a space or \n or } or {
		// =value is optional and defaults to `true`
		// todo: add support for escaping and quoting to the parser here. newlines should not be allowed even in quoted attribs unless escaped
		function readProps() {
			var start = i
			var end = code.indexOf(" ", i)
			if (end < 0)
				end = code.length
			var end2 = code.indexOf("\n", i)
			if (end2 >= 0 && end2 < end)
				end = end2
			end2 = code.indexOf("}", i)
			if (end2 >= 0 && end2 < end)
				end = end2
			end2 = code.indexOf("{", i)
			if (end2 >= 0 && end2 < end)
				end = end2
			
			restore(end)
			eatChar(" ")
			
			var propst = code.substring(start, end)
			var props = {}
			propst.split(",").forEach(function(x){
				var pair = split1(x, "=")
				if (pair[1] == null)
					pair[1] = true
				props[pair[0]] = pair[1]
			})
			return props
		}
		
		// string.repeat doesn't exist
		function addMulti(text, count) {
			while (count --> 0)
				addText(text)
		}
		
		function readLink() {
			var embed = eatChar("!")
			if (readBracketedLink(embed) || readPlainLink(embed))
				return true
			else if (embed) {
				addText("!")
				return true
				//lesson: if anything is eaten, you must return true if it's in the top level if switch block
			}
		}
		
		function readPlainLink(embed) {
			if (isUrlStart()) {
				var url = readUrl()
				var after = eatChar("[")
				
				if (embed) {
					var type = urlType(url)
					var altText = null
					if (after) {
						altText = ""
						while (c && c!=']' && c!="\n") {
							eatChar("\\")
							altText += c
							scan()
						}
						scan()
					}
					addBlock(type, {"":url}, altText)
				} else {
					if (after)
						startBlock('customLink', {inBrackets: true}, {"":url})
					else
						addBlock('simpleLink', {"":url})
				}
				return true
			}
		}
		
		// closeAll(true) - called at end of document
		// closeAll(false) - called at end of {} block
		function closeAll(force) {
			while(stack.length) {
				var top = stack.top()
				if (top.type == 'root') {
					break
				}
				if (!force && top.type == null) {
					endBlock()
					break
				}
				endBlock()
			}
		}
		
		// called at the end of a line (unescaped newline)
		function endLine() {
			while (1) {
				var top = stack.top()
				if (top.type == 'heading' || top.type == 'quote') {
					endBlock()
				} else if (top.type == 'item') {
					if (top.type == 'item')
						endBlock()
					var indent = 0
					while (eatChar(" "))
						indent++
					// OPTION 1:
					// no next item; end list
					if (c != "-") {
						while (top_is('list')) //should ALWAYS happen at least once
							endBlock()
						addMulti(" ", indent)
					} else {
						scan()
						while (eatChar(" ")) {}
						// OPTION 2:
						// next item has same indent level; add item to list
						if (indent == top.level) {
							startBlock('item', {level: indent})
							// OPTION 3:
							// next item has larger indent; start nested list
						} else if (indent > top.level) {
							startBlock('list', {level: indent}, {})
							startBlock('item', {level: indent}) // then made the first item of the new list
							// OPTION 4:
							// next item has less indent; try to exist 1 or more layers of nested lists
							// if this fails, fall back to just creating a new item in the current list
						} else {
							// TODO: currently this will just fail completely
							while(1) {
								top = stack.top()
								if (top && top.type == 'list') {
									if (top.level <= indent) {
										break
									} else {
										endBlock()
									}
								} else {
									// no suitable list was found :(
									// so just create a new one
									startBlock('list', {level: indent}, {})
									break
								}
							}
							startBlock('item', {level: indent})
						}
						break //really?
					}
				} else {
					addLineBreak()
					break
				}
			}
		}
		
		// audio, video, image, youtube
		//todo: improve this lol
		function urlType(url) {
			if (/(\.mp3(?!\w)|\.ogg(?!\w)|\.wav(?!\w)|#audio$)/i.test(url))
				return "audio"
			if (/(\.mp4(?!\w)|\.mkv(?!\w)|\.mov(?!\w)|#video$)/i.test(url))
				return "video"
			if (/^(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)\&?/.test(url))
				return "youtube"
			return "image"
		}
		
		// common code for all text styling tags (bold etc.)
		function doMarkup(type, create) {
			var symbol = c
			scan()
			if (canStartMarkup(type)) {
				startBlock(type, {})
			} else if (canEndMarkup(type)) {
				endBlock()
			} else {
				addText(symbol)
			}
		}
		// todo: maybe have support for non-ASCII punctuation/whitespace?
		function canStartMarkup(type) {
			return (
				(!code[i-2] || char_in(code[i-2], " \t\n({'\"")) && //prev char is one of these (or start of text)
				(c && !char_in(c, " \t\n,'\"")) && //next char is not one of these
				!stackContains(type)
			)
		}
		function canEndMarkup(type) {
			return (
				top_is(type) && //there is an item to close
				!char_in(code[i-2], " \t\n,'\"") && //prev char is not one of these
				(!c || char_in(c, " \t\n-.,:!?')}\"")) //next char is one of these (or end of text)
			)
		}
		function char_in(chr, list) {
			return chr && list.indexOf(chr) != -1
		}
		
		function lineStart() {
			startOfLine = true
			leadingSpaces = 0
		}
		
	}
	
	Parse.lang.bbcode = function(codeArg) {
		var noNesting = {
			spoiler:true
		}
		// this translates bbcode tag names into
		// the standard block names, + arg, + contents for special blocks
		// to be passed to startblock or functions to addblock
		var blockNames = {'b':true,'i':true,'u':true,'s':true,'sup':true,'sub':true,'table':true,'tr':true,'td':true,'align':true,'list':true,'spoiler':true,'quote':true,'anchor':true,'item':true,'h1':true,'h2':true,'h3':true,'th':true,'code':2,'url':2,'youtube':2,'audio':2,'video':2,'img':2,ruby:true}
		function blockTranslate(name, args, contents) {
			// direct translations:
			var name2 = {
				b: 'bold',
				i: 'italic',
				u: 'underline',
				s: 'strikethrough',
				sup: 'superscript',
				sub: 'subscript',
				table: 'table',
				tr: 'row',
				td: 'cell',
				align: 'align',
				list: 'list',
				spoiler: 'spoiler',
				ruby: 'ruby',
				quote: 'quote',
				anchor: 'anchor',
				item: 'item',
			}[name]
			if (name2)
				return [name2, args, contents]
			// other simple translations
			if (name == 'h1')
				return ['heading', 1]
			if (name == 'h2')
				return ['heading', 2]
			if (name == 'h3')
				return ['heading', 3]
			if (name == 'th')
				return ['cell', Object.assign({h:true}, args)]
			
			if (name == 'code') {
				var inline = args[""] == 'inline'
				args[""] = args.lang
				if (inline)
					return ['icode', args, contents]
				if (contents[0]=="\n")
					contents = contents.substr(1)
				return ['code', args, contents]
			}
			
			//todo: maybe these should have args mapped over uh
			if (name == 'url') {
				if (contents != undefined)
					return ['simpleLink', {"":contents}]
				else
					return ['customLink', args]
			}
			
			if (name == 'youtube')
				return ['youtube', {"":contents}, args.alt]
			if (name == 'audio')
				return ['audio', {"":contents}, args.alt]
			if (name == 'video')
				return ['video', {"":contents}, args.alt]
			if (name == 'img')
				return ['image', {"":contents}, args.alt]
		}
		
		init(function() {
			i++
			c = code.charAt(i)
		}, codeArg)
		
		var point = 0
		
		while (c) {
			//===========
			// [... tag?
			if (eatChar("[")) {
				point = i-1
				// [/... end tag?
				if(eatChar("/")) {
					var name = readTagName()
					// invalid end tag
					if (!eatChar("]") || !name) {
						cancel()
					// valid end tag
					} else {
						// end last item in lists (mostly unnecessary now with greedy closing)
						if (name == "list" && stack.top().type == "item")
							endBlock(point)
						if (greedyCloseTag(name)) {
							// eat whitespace between table cells
							if (name == 'td' || name == 'th' || name == 'tr')
								while(eatChar(' ')||eatChar('\n')){
								}
						} else {
							// ignore invalid block
							//addBlock('invalid', code.substring(point, i), "unexpected closing tag")
						}
					}
				// [... start tag?
				} else {
					var name = readTagName()
					if (!name || !blockNames[name]) {
						// special case [*] list item
						if (eatChar("*") && eatChar("]")) {
							if (stack.top().type == "item")
								endBlock(point)
							var top = stack.top()
							if (top.type == "list")
								startBlock('item', {bbcode:'item'}, {})
							else
								cancel()
						} else
							cancel()
					} else {
						// [tag=...
						var arg = true, args = {}
						if (eatChar("=")) {
							var start=i
							if (eatChar('"')) {
								start++
								while (c && c!='"')
									scan()
								if (c == '"') {
									scan()
									arg = code.substring(start, i-1)
								}
							} else {
								while (c && c!="]" && c!=" ")
									scan()
								if (c == "]" || c == " ")
									arg = code.substring(start, i)
							}
						}
						if (eatChar(" ")) {
							args = readArgList() || {}
						}
						if (arg !== true)
							args[""] = arg
						if (eatChar("]")) {
							if (blockNames[name]==2 && !(name=="url" && arg!==true)) {
								var endTag = "[/"+name+"]"
								var end = code.indexOf(endTag, i)
								if (end < 0)
									cancel()
								else {
									var contents = code.substring(i, end)
									restore(end + endTag.length)
									
									var tx = blockTranslate(name, args, contents)
									addBlock(tx[0], tx[1], tx[2])
								}
							} else if (name!="item" && blockNames[name] && !(noNesting[name] && stackContains(name))) {
								if (name == 'tr' || name == 'table')
									while(eatChar(' ')||eatChar('\n')){
									}
								var tx = blockTranslate(name, args)
								startBlock(tx[0], {bbcode:name}, tx[1])
							} else
								addBlock('invalid', code.substring(point, i), "invalid tag")
						} else
							cancel()
					}
				}
			} else if (readPlainLink()) {
			} else if (eatChar('\n')) {
				addLineBreak()
			} else {
				addText(c)
				scan()
			}
		}
		endAll()
		return output.node
		
		function cancel() {
			restore(point)
			addText(c)
			scan()
		}
		
		function greedyCloseTag(name) {
			for (var j=0; j<stack.length; j++)
				if (stack[j].bbcode == name) {
					while (stack.top().bbcode != name)//scary
						endBlock()
					endBlock()
					return true
				}
			return false
		}
		
		function readPlainLink() {
			if (isUrlStart()) {
				var url = readUrl()
				addBlock('simpleLink', {"":url})
				return true
			}
		}
		
		function readArgList() {
			var args = {}
			while (1) {
				// read key
				var start = i
				while (isTagChar(c))
					scan()
				var key = code.substring(start, i)
				// key=...
				if (eatChar("=")) {
					// key="...
					if (eatChar('"')) {
						start = i
						while (c && c!='"' && c!="\n")
							scan()
						if (eatChar('"'))
							args[key] = code.substring(start, i-2)
						else
							return null
						// key=...
					} else {
						start = i
						while (c && c!=" " && c!="]" && c!="\n")
							scan()
						if (c == "]") {
							args[key] = code.substring(start, i)
							return args
						} else if (eatChar(" "))
							args[key] = code.substring(start, i-1)
						else
							return null
					}
					// key ...
				} else if (eatChar(" ")) {
					args[key] = true
					// key]...
				} else if (c == "]") {
					args[key] = true
					return args
					// key<other char> (error)
				} else
					return null
			}
		}
		
		function readTagName() {
			var start = i
			while (isTagChar(c))
				scan()
			return code.substring(start, i)
		}
		
		function isTagChar(c) {
			return c>="a" && c<="z" || c>="A"&&c<="Z" || c>="0"&&c<="9"
		}
	}
	
	// "plain text" (with autolinker)
	Parse.fallback = function(text) {
		var options = Parse.options
		var root = options.root()
		i = 0
		code = text
		output = root
		
		var linkRegex = /\b(?:https?:\/\/|sbs:)[-\w\$\.+!*'(),;/\?:@=&#%]*/g
		var result
		var out = "", last = 0
		while (result = linkRegex.exec(text)) {
			// text before link
			options.append(root, options.text(text.substring(last, result.index)))
			// generate link
			var link = options.simpleLink({"": result[0]})
			options.append(root, link)
			
			last = result.index + result[0].length
		}
		// text after last link (or entire message if no links were found)
		options.append(root, options.text(text.substr(last)))
		
		return root.node
	}
	
	Parse.parseLang = function(text, lang, preview) {
		//var start = performance.now()
		options = Parse.options //temp
		i=0
		code = text
		if (code == undefined || code == "") // "" is... debatable
			return options.root().node
		if (preview) {
			cache = editorCache
		} else {
			cache = null
		}
		try {
			var parser = Parse.lang[lang] || Parse.fallback
			return parser(text)
		} catch(e) {
			try {
				if (!output) {
					output = options.root()
				}
				options.append(output, options.error(e, e.stack))
				options.append(output, options.text(code.substr(i)))
				return output.node
			} catch (e) {
				alert("Unrecoverable parser error! please report this!\n"+e+"\n"+e.stack)
			}
		}/* finally {
			console.log("time:", performance.now() - start)
		}*/
	}
}
