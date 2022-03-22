"use strict"

let Markup = Object.seal({
	parse: parse,
	render: null,
	convert(text) {
		let tree = Markup.parse(text)
		return Markup.render(tree)
	}
})

let arg_regex = [
	/(?:\[([^\]\n]*)\])?({)?/y,
	/(?:\[([^\]\n]*)\])?(?:({)| )/y,
	/(?:\[([^\]\n]*)\])?({)? */y,
	/(?:\[([^\]\n]*)\])? */y,
	/(?:\[([^\]\n]*)\])?/y,
]
// maybe instead of this separate parse step, we should just do something like
// go back to using ex: /^><args>?[{ ]/
// have either
// - custom post-processing regex for each token (ex /[\\](\w+)(<args>)?({)?/ )
// - include these extra groups in the main regex, remove the () group, and find a replacement for the () indexOf("") system

/* NOTE:

 /^/ matches after a <newline> or <env> token
 /$/ matches end of string
 /<eol>/ matches end of line (replaced with /(?![^\n])/)
 /<args>/ matches "[...]" arguments (replaced with /(?:\[[^\]\n]*\])/)

*/
let [regex, groups] = process_def([
	[/\n/, {token:'newline'}],
	
	[/^#{1,3}/, {token:'heading',args:3}],
	[/^---+<eol>/, {token:'line'}],
	
	//todo: improve these
	[/(?:[*][*]|__|~~|[/])(?=\w)/, {token:'style'}], 
	[/(?:[*][*]|__|~~|[/])/, {token:'style_end'}],
	
	// what if we just had a flag for "this has args"
	
	[/[\\]\w+/, {token:'env',args:1}],
	//[/{/, {token:''}], // maybe
	[/}/, {token:'block_end'}],
	[/[\\]{/, {token:'null_env'}],
	[/[\\][^]/, {token:'escape'}], //todo: match surrogate pairs
	
	[/^>/, {token:'quote',args:2}],
	
	[/^```[^]*?\n```/, {token:'code'}],
	[/`[^`\n]+`/, {token:'icode'}],
	
	[
		/(?:!())?(?:https?:[/][/]|sbs:)<url_char>*<url_final>/,
		{token:'embed',args:5}, {token:'link',args:1}
	],
	
	[/ *[|] *\n[|]/, {token:'table_row',args:4}],
	[/ *[|] *<eol>/, {token:'table_end'}],
	[/^ *[|]/, {token:'table',args:4}],
	[/ *[|]/, {token:'table_cell',args:4}],
	
	//[/^ *- /, 'list'],
])

function process_def(table) {
	//([^]*)
	let regi = []
	let groups = []
	for (let [regex, ...matches] of table) {
		let r = regex.source.replace(/<(\w+)>/g, (m,name)=>({
			args: /(?:\[[^\]\n]*\])/,
			eol: /(?![^\n])/,
			url_char: /[-\w./%?&=#+~@:$*',;!)(]/,
			url_final: /[-\w/%&=#+~@$*';)(]/,
		}[name].source))+"()"
		regi.push(r)
		
		groups.push(...matches)
	}
	let r = new RegExp(regi.join("|"), 'g')
	return [r, groups]
}

function parse(text) {
	let list = []
	let {push_tag, push_text, finish} = parser()
	
	let last = regex.lastIndex = 0
	for (let match; match=regex.exec(text); ) {
		// pre
		push_text(text.substring(last, match.index))
		last = regex.lastIndex
		// process
		let group = match.indexOf("", 1) - 1
		let thing = groups[group]
		list.push(thing.token)
		let tag = match[0]
		// parse args and {
		let args, body
		if (thing.token=='null_env')
			body = true
		if (thing.args) {
			let ar = arg_regex[thing.args-1]
			ar.lastIndex = regex.lastIndex
			let m = ar.exec(text)
			if (m) {
				tag += m[0]
				args = m[1]
				body = m[2]
				last = regex.lastIndex = ar.lastIndex
			} else { // INVALID!
				// skip 1 char
				last = match.index
				regex.lastIndex = match.index+1
				// try parsing again
				continue
			}
		}
		// process
		push_tag(thing.token, tag, args, body)
		// start of line
		if (thing.token=='newline' || body) {
			text = text.substring(last)
			last = regex.lastIndex = 0
		}
	}
	push_text(text.substring(last))
	window.l=list
	return finish()
}
