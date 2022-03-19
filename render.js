let elems = {
	newline: 'br',
	heading: 'h1',
	line: 'hr',
	style: 'i',
	env: 'b', //todo
	env1: 'input',
	quote: 'blockquote',
	icode: 'code',
	code: 'pre',
	link: 'a',
	table: 'table',
	table_row: 'tr',
	table_cell: 'td'
}

function render(tree) {
	// text
	if (typeof tree == 'string')
		return document.createTextNode(tree)
	// leaf
	if (!tree.content)
		return document.createElement(elems[tree.type])
	// element with children
	if (tree.type=='ROOT')
		elem = document.createDocumentFragment()
	else
		elem = document.createElement(elems[tree.type])
	for (let i of tree.content)
		elem.append(render(i))
	return elem
}
