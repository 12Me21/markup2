let temp = document.createElement('template')
function 𐀶([html]) {
	temp.innerHTML = html.replace(/\s*?\n\s*/g, "")
	let node = temp.content
	if (node.childNodes.length==1)
		node = node.firstChild
	return document.importNode.bind(document, node, true)
}

let CREATE = {
	node: function(node) {
		if ('string'==typeof node)
			return CREATE.text(node)
		if (node.content)
			return CREATE.branch(node)
		return CREATE.leaf(node)
	},
	
	branch: function(node) {
		let e = this()
		let [type, args] = e.firstChild.childNodes
		let content = e.lastChild
		type.textContent = node.type
		if (node.args)
			args.textContent = JSON.stringify(node.args)
		else
			args.remove()
	//	if (node.content.length == 1)
	//		e.classList.add('one')
		if (node.content.every(x=>'string'==typeof x || !x.content || !x.content.length))
			e.classList.add('one')
		return content
	}.bind(𐀶`
<tree-node class='branch'>
	<div><span class='type'></span><span class='args'></span></div>
	<node-content>
`),
	
	leaf: function(node) {
		let e = this()
		let [type, args] = e.firstChild.childNodes
		type.textContent = node.type
		if (node.args)
			args.textContent = JSON.stringify(node.args)
		else
			args.remove()
		return e
	}.bind(𐀶`
<tree-node class='leaf'>
	<div><span class='type'></span><span class='args'></span></div>
`),
	
	text: function(node) {
		let e = this()
		e.textContent = JSON.stringify(node)
		return e
	}.bind(𐀶`<tree-node class='text'>`),
}

function draw_node(node) {
	let elem = CREATE.node(node)
	if (node.content)
		for (let n of node.content)
			elem.append(draw_node(n))
	return elem.getRootNode()
}
