"use strict"

let Markup = Object.seal({
	parse: parse,
	render: null,
	convert(text) {
		let tree = Markup.parse(text)
		return Markup.render(tree)
	}
})

// NOTE:

// /^/ matches after a <newline> or <env> token
// /$/ matches end of string
//  use /(?![^\n])/ to match at end of line
// /@@@/ - matches "[...]" arguments (replaced with /(?:\[[^\]\n]*\])/)

let [regex, groups] = process_def([
	[/\n/, 'newline'],
	
	[/^#{1,3}@@@? /, 'heading'],
	[/^---+(?![^\n])/, 'line'],
	
	[/(?:[*][*]|__|~~|[/])(?=\w()|\W|$)/, 'style', 'style_end'], //todo: improve this one
	
	[/[\\](?:\w+@@@?)?{/, 'env'],
	[/[\\]\w+@@@?/, 'env1'],
	[/}/, 'env_end'],
	[/[\\][^]/, 'escape'],
	
	[/^>@@@?[{ ]/, 'quote'],
	
	[/^```[^]*?\n```/, 'code'],
	[/`[^`\n]+`/, 'icode'],
	
	[/!?(?:https?:[/][/]|sbs:)[-\w./%?&=#+~@:$*',;!)(]*[-\w/%&=#+~@$*';)(]@@@?/, 'link'],
	
	[/ *[|] *\n[|]@@@? */, 'table_row'],
	[/ *[|]@@@? *(?![^\n])/, 'table_end'],
	[/^ *[|]@@@? */, 'table'],
	[/ *[|]@@@? */, 'table_cell'],
	
	//[/^ *- /, 'list'],
])

function process_def(table) {
	//([^]*)
	let regi = []
	let types = []
	for (let [regex, ...groups] of table) {
		let r = regex.source.replace(/@@@/g,/(?:\[[^\]\n]*\])/.source)
		regi.push(r+"()")
		types.push(...groups)
	}
	let r = new RegExp(regi.join("|"), 'g')
	return [r, types]
}

function parse(text) {
	let list = []
	let {push_tag, push_text, finish} = parser()
	
	let last = regex.lastIndex = 0
	for (let match; match=regex.exec(text); last=regex.lastIndex) {
		// process
		let group = match.indexOf("", 1) - 1
		let type = groups[group]
		// handle
		list.push(type)
		push_text(text.substring(last, match.index))
		push_tag(type, match[0])
		
		// select mode
		if (type=='newline' || type=='env') {
			text = text.substring(regex.lastIndex)
			regex.lastIndex = 0
		}
	}
	push_text(text.substring(last))
	window.l=list
	return finish()
}
