let tags = [
	/\n/, 'newline',
	
	/^#{1,3} /, 'heading',
	/^---+$/, 'line',
	
	/(?:[*][*]|__|~~|[/])(?!\W()|\w)/, 'style_start', 'style_end',
	
	/[\\](?:{|\w+(?:\[.*?\])?{?)/, 'env_start',
	/}/, 'env_end',
	/[\\][^]/, 'escape',
	
	/`.*?`/, 'icode',
	/^```[^]*?^```/, 'code',
	
	/!?(?:https?:[/][/]|sbs:)[-\w./%?&=#+~@:$*',;!)(]*[-\w/%&=#+~@$*';)(](?:\[.*?\])?{?/, 'link',
	
	/ *[|] *$(?!\n[|])/, 'table_end',
	/ *(?:[|] *\n()|^()|)[|](?:\[.*?\])? */, 'table_row', 'table_start', 'table_cell',
	
	/^ *- /, 'list',
]
//[-\w/%&=#+~@$*';]
//[-\w./%?&=#+~@:$*',;!]
//[-\w./%?&=#+~@:$*',;!]*(?:[-\w/%&=#+~@$*';]|[(][-\w./%?&=#+~@:$*',;!]*[)](?:[-\w./%?&=#+~@:$*',;!]*[-\w/%&=#+~@$*';])?)
let regi = []
let types = []
for (let item of tags) {
	if (item instanceof RegExp)
		regi.push(item.source+"()")
	else
		types.push(item)
}
let r = new RegExp("("+regi.join("|")+")", 'm')
let step = types.length+2

function check_tag(text, tag, type) {
	return types[type]
}

function lex(text) {
	// main lexing step
	let spl = String.prototype.split.call(text, r)
	// filter tags
	let list = []
	let bac = ""
	let i;
	for (i=0; i<spl.length-1; i+=step) {
		let text = spl[i]
		let tag = spl[i+1]
		let type = spl.indexOf("", i+2) - (i+2)
		type = check_tag(text, tag, type)
		if (type!=null) {
			list.push(bac ? bac+text : text, tag, type)
			bac = ""
		} else {
			bac += text+tag
		}
	}
	list.push(bac+spl[i])
	
	return list
}

function prune(list) {
	let stack = []
}

///(?<![^\s({'"])[/](?![\s,'"])/
