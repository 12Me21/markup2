let HTML = ([html])=>{
	let temp = document.createElement('template')
	temp.innerHTML = html.replace(/\s*?\n\s*/g, "")
	let content = temp.content
	let root = content
	if (root.childNodes.length==1)
		root = root.firstChild
	
	// get from `root` to `node` using .firstChild and .nextSibling
	// TODO: optimize this  yeah yeah !
	//1: sharing results !
	//  ex. if you have 2 nodes:
	// A = root.firstChild.nextSibling.nextSibling
	// B = root.firstChild.nextSibling.firstChild
	//  then this can be:
	// temp = root.firstChild.nextSibling
	// A = temp.nextSibling
	// B = temp.firstChild
	//2: using .lastChild, .childNodes[n], etc.?
	// i wonder if browsers can optimize it better when it's simple though
	let get_path = (root, node)=>{
		let path = ""
		while (node!==root) {
			let parent = node.parentNode
			let pos = [].indexOf.call(parent.childNodes, node)
			path = ".firstChild"+".nextSibling".repeat(pos) + path
			node = parent
		}
		return path
	}
	
	let init = `const node=document.importNode(this, true)
holder.$root=node`
	for (let node of content.querySelectorAll("[\\$]")) {
		let path = get_path(root, node)
		let id = node.getAttribute('$')
		node.removeAttribute('$')
		id = id.replace(/,/g, " = holder.$")
		init += `
holder.$${id} = node${path}`
	}
	init += `
return holder`
	let c = new Function("holder={}", init).bind(root)
	//c.prototype = {__proto__: null, template: root}
	return c
}

let err_template = HTML`
<div class='result'>
	<div $=type><div>
	<div $=tree><div>
	<div $=field><div>
	<div>Expect:<span $=expect><span></div>
	<div>Got:<span $=got><span></div>
</div>
`

let ok_template = HTML`
<div class='result'>
	<div $=msg><div>
	<div $=time><div>
</div>
`

let result_template = HTML`
<div class='test'>
	<div>
		<div class='name' $=name></div>
		<div class='result' $=result></div>
	</div>
	<div>
		<div class='input' $=input></div>
	</div>
</div>
`

Test.prototype.draw_result = function() {
	let e = result_template()
	if (this.status < 0) {
		e.$root.classList.add('failed')
		let f = err_template()
	} else if (this.status > 0) {
		e.$root.classList.add('passed')
		let f = ok_template()
		f.$msg.textContent = this.result
		f.$time.textContent = (+this.parse_time).toFixed(1)+" ms"
	}
	
	e.$name.textContent = this.name
	e.$input.textContent = this.input
	
	return e.$root
}

Test.draw_results = function() {
	let f = document.createDocumentFragment()
	let good = []
	for (let test of this.all) {
		if (test.status > 0)
			good.push(test.draw_result())
		else
			f.append(test.draw_result())
	}
	f.append(...good)
	return f
}
