/*! 𝦗𖹭
*/

12||+typeof await/2//2; export default
/**
	12y2 markup parser factory
	@implements Parser_Collection
**/
class Markup_12y2 { constructor() {

	// all state is stored in these vars (and REGEX.lastIndex)
	let current, brackets
	
	// About __proto__ in object literals:
	// https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-runtime-semantics-propertydefinitionevaluation
	
	// elements which can survive an eol (without a body)
	const IS_BLOCK = {__proto__:null, code:1, divider:1, ROOT:1, heading:1, quote:1, table:1, table_cell:1, image:1, video:1, audio:1, spoiler:1, align:1, list:1, list_item:1, youtube:1, anchor:1}
	
	const MACROS = {
		'{EOL}': "(?![^\\n])",
		'{BOL}': "^",
		'{ANY}': "[^]",
		'{URL_CHARS}': "[-\\w/%&=#+~@$*'!?,.;:]*",
		'{URL_FINAL}': "[-\\w/%&=#+~@$*']",
	}
	const GROUPS = []
	let regi = []
	const PAT=({raw}, ...groups)=>{
		regi.push(
			raw.join("()")
				.replace(/\\`/g, "`")
				.replace(/[(](?![?)])/g, "(?:")
				.replace(/[{][A-Z_]+[}]/g, match=>MACROS[match])
		)
		GROUPS.push(...groups)
	}
	
	PAT`[\n]?[}]${'BLOCK_END'}`
	PAT`[\n]${'NEWLINE'}`
	PAT`{BOL}[#]{1,4}(?=[\[{ ])${'HEADING'}`
	PAT`{BOL}[>](?=[\[{ ])${'QUOTE'}`
	PAT`{BOL}[-]{3,}{EOL}${'DIVIDER'}`
	PAT`([*][*]|[_][_]|[~][~]|[/])${'STYLE'}`
	PAT`[\\][a-z]+(?![a-zA-Z0-9])${'TAG'}`
	PAT`[\\][{][\n]?${'NULL_ENV'}`
	PAT`[\\]{ANY}${'ESCAPED'}`
	PAT`{BOL}[\`]{3}(?=[^\n\`]*?{EOL})${'CODE_BLOCK'}`
	PAT`[\`][^\`\n]*([\`]{2}[^\`\n]*)*[\`]?${'INLINE_CODE'}`
	PAT`([!]${'EMBED'})?\b(https?://|sbs:){URL_CHARS}({URL_FINAL}|[(]{URL_CHARS}[)]({URL_CHARS}{URL_FINAL})?)${'LINK'}`
	PAT`{BOL} *[|]${'TABLE_START'}`
	PAT` *[|]${'TABLE_CELL'}`
	PAT`{BOL} *[-] ${'LIST_ITEM'}`
	
	const REGEX = new RegExp(regi.join("|"), 'g')
	regi = null
	
	//todo: org tables separators?
	

	
	const null_args = []
	null_args.named = Object.freeze({})
	Object.freeze(null_args)
	const NO_ARGS = []
	NO_ARGS.named = Object.freeze({})
	Object.freeze(NO_ARGS)
	// todo: do we even need named args?
	const parse_args=(arglist)=>{
		// note: checks undefined AND "" (\tag AND \tag[])
		if (!arglist)
			return null_args
		let list = [], named = {}
		list.named = named
		for (let arg of arglist.split(";")) {
			let [, name, value] = /^(?:([^=]*)=)?(.*)$/.exec(arg)
			// value OR =value
			// (this is to allow values to contain =. ex: [=1=2] is "1=2")
			if (!name)
				list.push(value)
			else // name=value
				named[name] = value
		}
		return list
	}
	// process an embed url: !https://example.com/image.png[alt=balls]
	// returns [type: String, args: Object]
	const process_embed=(url, rargs)=>{
		let type
		let args = {url}
		for (let arg of rargs) {
			let m
			if ('video'===arg || 'audio'===arg || 'image'===arg) {
				type = arg
			} else if (m = /^(\d+)x(\d+)$/.exec(arg)) {
				args.width = +m[1]
				args.height = +m[2]
			} else {
				if (args.alt==undefined)
					args.alt = arg
				else
					args.alt += ";"+arg
			}
		}
		if (rargs.named.alt!=undefined)
			args.alt = rargs.named.alt
		// todo: improve this
		if (!type) {
			if (/[.](mp3|ogg|wav|m4a)\b/i.test(url))
				type = 'audio'
			else if (/[.](mp4|mkv|mov)\b/i.test(url))
				type = 'video'
			else if (/^https?:[/][/](?:www[.])?(?:youtube.com[/]watch[?]v=|youtu[.]be[/]|youtube.com[/]shorts[/])[\w-]{11}/.test(url)) {
				// todo: accept [start-end] args maybe?
				type = 'youtube'
			}
		}
		if (!type)
			type = 'image'
		return [type, args]
	}
	
	// move up
	const pop=()=>{
		if (current.body)
			brackets--
		let o = current
		current = current.parent
		return o
	}
	
	const CANCEL=()=>{
		if ('style'===current.type) {
			let o = pop()
			current.content.push(o.args, ...o.content)
			current.prev = o.prev
			return
		}
		if ('table_cell'===current.type) {
			if (current.content.length) {
				CLOSE() // table_cell
				current.args = {}
			} else {
				// cancelling an empty table cell means:
				// it's the end of the row, so discard the cell
				let o = pop()
				// if the ROW is empty (i.e. we just have a single | )
				if (!current.content.length) {
					let o = pop() // discard the row
					TEXT(o.args)
					return
					// todo: maybe also cancel rows with 1 unclosed cell?
					// like `| abc` -> text
				}
				// transfer args to the row, and parse as table row args:
				let ret = current.args = {}
				for (let arg of o.args) {
					if ("*"===arg || "#"===arg) {
						ret.header = true
					}
				}
			}
			// fallthrough to close the table_row
		}
		CLOSE()
	}
	
	const get_last=(block)=>{
		return block.content[block.content.length-1]
	}
	
	const CLOSE=()=>{
		let o = pop()
		
		if ('null_env'===o.type) {
			current.content.push(...o.content)
			current.prev = o.prev
			return
		}
		
		if ('newline'===o.prev)
			o.content.push("\n")
		let node = {type: o.type, args: o.args, content: o.content}
		let dest = current
		
		// merge list_item with preceeding list
		if ('list_item'===o.type) {
			node.args = null
			let indent = o.args.indent
			while (1) {
				let curr = dest
				dest = get_last(curr)
				if (!dest || dest.type!=='list' || dest.args.indent>indent) {
					// create a new level in the list
					dest = {type:'list', args:{indent}, content:[]}
					// safe because there's no newline
					curr.content.push(dest)
					break
				}
				if (dest.args.indent == indent)
					break
			}
		}
		// merge table_row with preceeding table
		else if ('table_row'===o.type) {
			dest = get_last(current)
			if (!dest || 'table'!==dest.type) {
				dest = {type:'table', args:null, content:[]}
				current.content.push(dest)
			}
		}
		// table cell
		else if ('table_cell'===o.type) {
			let ret = node.args = {}
			for (let arg of o.args) {
				let m
				if ("*"===arg || "#"===arg)
					ret.header = true
				else if (['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray'].includes(arg))
					ret.color = arg
				else if (m = /^(\d*)x(\d*)$/.exec(arg)) {
					let [, w, h] = m
					if (+w > 1) ret.colspan = +w
					if (+h > 1) ret.rowspan = +h
				}
			}
		} else if ('style'===o.type) {
			node.type = {
				__proto__:null,
				'**': 'bold', '__': 'underline',
				'~~': 'strikethrough', '/': 'italic',
			}[o.args]
			node.args = null
		}
		
		dest.content.push(node)
		current.prev = o.type in IS_BLOCK ? 'block' : o.prev
	}
	// push text
	const TEXT=(text)=>{
		if (text!=="") {
			current.content.push(text) // todo: merge with surrounding textnodes?
			current.prev = 'text'
		}
	}
	// push empty tag
	const BLOCK=(type, args)=>{
		current.content.push({type, args})
		current.prev = type in IS_BLOCK ? 'block' : 'text'
	}
	
	const NEWLINE=(real)=>{
		if (real)
			while (!current.body && 'ROOT'!=current.type)
				CANCEL()
		if ('block'!==current.prev)
			current.content.push("\n")
		if ('all_newline'!==current.prev)
			current.prev = 'newline'
	}
	
	const in_table=()=>{
		for (let c=current; ; c=c.parent) {
			if ('table_cell'===c.type)
				return true
			if ('style'!==c.type)
				return false
		}
	}
	const do_style=(token_text, before, after)=>{
		for (let c=current; 'style'===c.type; c=c.parent)
			if (c.args===token_text) {
				if (!after || /[^\s,'"][-\s.,:;!?'")}{]/y.test(before+after))
					return c
				else
					break
			}
		
		if (!before || /[\s.({}'"][^\s,'"]/y.test(before+after))
			return true
	}

	let ARG_REGEX = /.*?(?=])/y
	let WORD_REGEX = /[^\s`^()+=\[\]{}\\|"';:,.<>/?!*]*/y
	let CODE_REGEX = /(?: *([-\w.+#$ ]+?) *(?![^\n]))?\n?([^]*?)(?:```|$)/y // ack
	
	const parse=(text)=>{
		let tree = {type: 'ROOT', content: [], prev: 'all_newline'}
		current = tree
		brackets = 0
		
		// these use REGEX, text
		const skip_spaces=()=>{
			let pos = REGEX.lastIndex
			while (" "===text.charAt(pos))
				pos++
			REGEX.lastIndex = pos
		}
		const read_code=()=>{
			let pos = REGEX.lastIndex
			CODE_REGEX.lastIndex = pos
			let [, lang, code] = CODE_REGEX.exec(text)
			REGEX.lastIndex = CODE_REGEX.lastIndex
			return [lang, code]
		}
		
		let rargs
		const read_args=()=>{
			let pos = REGEX.lastIndex
			let next = text.charAt(pos)
			if ("["!==next)
				return rargs = NO_ARGS
			ARG_REGEX.lastIndex = pos+1
			let argstr = ARG_REGEX.exec(text)
			if (!argstr)
				return rargs = NO_ARGS
			REGEX.lastIndex = ARG_REGEX.lastIndex+1
			return rargs = parse_args(argstr[0])
		}
		
		let body
		const read_body=(space=false)=>{
			let pos = REGEX.lastIndex
			let next = text.charAt(pos)
			if ("{"===next) {
				if ("\n"===text.charAt(pos+1))
					pos++
				REGEX.lastIndex = pos+1
				return body = true
			}
			if (space) {
				if (" "===next)
					REGEX.lastIndex = pos+1
				else
					return body = false
			}
			return body = undefined
		}
		// start a new block
		const OPEN=(type, args=null)=>{
			current = Object.seal({
				type, args, content: [],
				body, parent: current,
				prev: 'all_newline',
			})
			if (body)
				brackets++
		}
		const word_maybe=()=>{
			if (!body) {
				TEXT(read_word())
				CLOSE()
			}
		}
		
		let match
		let last = REGEX.lastIndex = 0
		const NEVERMIND=()=>{
			REGEX.lastIndex = match.index+1
		}
		const ACCEPT=()=>{
			TEXT(text.substring(last, match.index))
			last = REGEX.lastIndex
		}
		const read_word=()=>{
			let pos = REGEX.lastIndex
			WORD_REGEX.lastIndex = pos
			let word = WORD_REGEX.exec(text)
			if (!word)
				return null
			last = REGEX.lastIndex = WORD_REGEX.lastIndex
			return word[0]
		}
		
		let prev = -1
		main: while (match = REGEX.exec(text)) {
			// check for infinite loops
			if (match.index===prev)
				throw ["INFINITE LOOP", match]
			prev = match.index
			// 2: figure out which token type was matched
			let token = match[0]
			let group_num = match.indexOf("", 1)-1
			let type = GROUPS[group_num]
			// 3: 
			body = null
			rargs = null

			switch (type) {
			case 'TAG': {
				read_args()
				read_body(true)
				if (NO_ARGS===rargs && false===body) {
					NEVERMIND()
					continue main
				}
				ACCEPT()
				switch (token) { default: {
					let args = {text:text.substring(match.index, last), reason:"invalid tag"}
					if (body)
						OPEN('invalid', args)
					else
						BLOCK('invalid', args)
				} break; case '\\sub': {
					OPEN('subscript')
					word_maybe()
				} break; case '\\sup': {
					OPEN('superscript')
					word_maybe()
				} break; case '\\b': {
					OPEN('bold')
					word_maybe()
				} break; case '\\i': {
					OPEN('italic')
					word_maybe()
				} break; case '\\u': {
					OPEN('underline')
					word_maybe()
				} break; case '\\s': {
					OPEN('strikethrough')
					word_maybe()
				} break; case '\\quote': {
					OPEN('quote', {cite: rargs[0]})
				} break; case '\\align': {
					let a = rargs[0]
					if (!['left', 'right', 'center'].includes(a))
						a = 'center'
					OPEN('align', {align: a})
				} break; case '\\spoiler': case '\\h': {
					let [label="spoiler"] = rargs
					OPEN('spoiler', {label})
				} break; case '\\ruby': {
					let [txt="true"] = rargs
					OPEN('ruby', {text: txt})
					word_maybe()
				} break; case '\\key': {
					OPEN('key')
					word_maybe()
				} break; case '\\a': {
					let id = rargs[0]
					id = id ? id.replace(/\W+/g, "-") : null
					OPEN('anchor', {id})
					body = true // ghhhh?
					//BLOCK('anchor', {id})
				} break; case '\\link': {
					let args = {url: rargs[0]}
					if (body) {
						OPEN('link', args)
					} else {
						args.text = args.url
						BLOCK('simple_link', args)
					}
				}}
			} break; case 'STYLE': {
				let c = do_style(token, text.charAt(match.index-1), text.charAt(REGEX.lastIndex))
				if (!c) { // no
					NEVERMIND()
				} else if (true===c) { // open new
					ACCEPT()
					OPEN('style', token)
				} else { // close
					ACCEPT()
					while (current != c)
						CANCEL()
					CLOSE()
				}
				continue main
			} break; case 'TABLE_CELL': {
				if (!in_table()) {
					NEVERMIND()
					continue main
				}
				read_args()
				skip_spaces()
				ACCEPT()
				while (current.type!=='table_cell')
					CANCEL()
				CLOSE() // cell
				// we don't know whether these are row args or cell args,
				// so just pass the raw args directly, and parse them later.
				OPEN('table_cell', rargs)
			} break; case 'TABLE_START': {
				read_args()
				skip_spaces()
				ACCEPT()
				let args_token = text.substring(match.index, last)
				OPEN('table_row', args_token, false) // special OPEN call
				OPEN('table_cell', rargs)
			} break; case 'NEWLINE': {
				ACCEPT()
				NEWLINE(true)
				body = true // to trigger start_line
			} break; case 'HEADING': {
				read_args()
				read_body(true)
				if (NO_ARGS===rargs && false===body) {
					NEVERMIND()
					continue main
				}
				ACCEPT()
				let level = token.length
				let args = {level}
				let id = rargs[0]
				args.id = id ? id.replace(/\W+/g, "-") : null
				// todo: anchor name (and, can this be chosen automatically based on contents?)
				OPEN('heading', args)
			} break; case 'DIVIDER': {
				ACCEPT()
				BLOCK('divider')
			} break; case 'BLOCK_END': {
				ACCEPT()
				if (brackets>0) {
					while (!current.body)
						CANCEL()
					if ('invalid'===current.type) {
						if ("\n}"==token)
							NEWLINE(false) // false since we already closed everything
						TEXT("}")
					}
					CLOSE()
				} else {
					// hack:
					if ("\n}"==token)
						NEWLINE(true)
					TEXT("}")
				}
			} break; case 'NULL_ENV': {
				body = true
				ACCEPT()
				OPEN('null_env')
				current.prev = current.parent.prev
			} break; case 'ESCAPED': {
				ACCEPT()
				if ("\\\n"===token)
					NEWLINE(false)
				else if ("\\."===token) { // \. is a no-op
					// todo: close lists too
					//current.content.push("")
					current.prev = 'block'
				} else
					TEXT(token.substring(1))
			} break; case 'QUOTE': {
				read_args()
				read_body(true)
				if (NO_ARGS===rargs && false===body) {
					NEVERMIND()
					continue main
				}
				ACCEPT()
				OPEN('quote', {cite: rargs[0]})
			} break; case 'CODE_BLOCK': {
				let [lang, code] = read_code()
				ACCEPT()
				BLOCK('code', {text:code, lang})
			} break; case 'INLINE_CODE': {
				ACCEPT()
				BLOCK('icode', {text: token.replace(/`(`)?/g, "$1")})
			} break; case 'EMBED': {
				read_args()
				ACCEPT()
				let url = token.substring(1) // ehh better
				let [type, args] = process_embed(url, rargs)
				BLOCK(type, args)
			} break; case 'LINK': {
				read_args()
				read_body()
				ACCEPT()
				let url = token
				let args = {url}
				if (body) {
					OPEN('link', args)
				} else {
					args.text = rargs[0]
					BLOCK('simple_link', args)
				}
			} break; case 'LIST_ITEM': {
				ACCEPT()
				let indent = token.indexOf("-")
				OPEN('list_item', {indent})
			} }

			if (body) {
				text = text.substring(last)
				last = REGEX.lastIndex = 0
				prev = -1
			}
		} // end of main loop
		
		TEXT(text.substring(last)) // text after last token
		
		while ('ROOT'!==current.type)
			CANCEL()
		if ('newline'===current.prev) //todo: this is repeated
			current.content.push("\n")
		
		return tree // technically we could return `current` here and get rid of `tree` entirely
	}
	
	this.parse = parse
	this.langs = {'12y2': parse}
	
	// what if you want to write like, "{...}". well that's fine
	// BUT if you are inside a tag, the } will close it.
	// maybe closing tags should need some kind of special syntax?
	// \tag{ ... \}  >{...\} idk..
	// or match paired {}s :
	// \tag{ ...  {heck} ... } <- closes here
	
	// todo: after parsing a block element: eat the next newline directly
} }

if ('object'==typeof module && module) module.exports = Markup_12y2
