let tags = [
	/[/]/,
	/[**]/,
	/[\\]\w+/,
	/`(?:[^`]|``)*`/,
]
let r = new RegExp("("+tags.map(tag=>tag.source+"()").join("|")+")")

function parse(text) {
	let spl = String.prototype.split.call(text, r)
	spl = filter_tags(spl)
	for (let i=0; i<spl.length; i+=3) {
		console.log(spl[i])
		console.log(spl[i+1], spl[i+2])
	}
}

function check_tag(text, tag, type) {
	switch (type) {
	case 0:
		if (/\w$/.test(text))
			return 'italic_end'
		return 'italic_start'
	case 1:
		if (/\w$/.test(text))
			return 'bold_end'
		return 'bold_start'
	case 2:
		return 'tag_start'
	case 3:
		return 'icode'
	}
	return true
}

function filter_tags(spl) {
	let list = []
	let bac = ""
	let i;
	for (i=0; i<spl.length-1; i+=tags.length+2) {
		let text = spl[i]
		let tag = spl[i+1]
		let type = spl.indexOf("", i+2) - (i+2)
		type = check_tag(text, tag, type)
		if (type!=null) {
			list.push(bac+text, tag, type)
			bac = ""
		} else {
			bac += text + tag
		}
	}
	list.push(bac+spl[i])
	return list
}
