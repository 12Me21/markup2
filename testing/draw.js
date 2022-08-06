let HTML = ([html])=>{
	let temp = document.createElement('template')
	temp.innerHTML = html.replace(/\s*?\n\s*/g, "")
	let content = temp.content
	let root = content
	if (root.childNodes.length==1)
		root = root.firstChild
	
	let get_path=(root, node)=>{
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

let pass_template = HTML`
<div class='test passed'>
	<div>
		<div class='name' $=name></div>
	</div>
	<div>
		<div class='lang' $=lang></div>
	</div>
	<div>
		<div class='time' $=time></div>
	</div>
	<details>
		<summary>input</summary>
		<textarea class='input' $=input></textarea>
	</details>
</div>
`

let fail_template = HTML`
<div class='test failed'>
	<div>
		<div class='name' $=name></div>
		<div class='lang' $=lang></div>
		<div class='result' $=result></div>
	</div>
	<div>
		<div class='tree' $=tree></div>
	</div>
	<div class='compare'>
		<span>Expect:</span><code $=correct></code>
		<span>Got:</span><code $=got></code>
	</div>
	<details>
		<summary>input</summary>
		<textarea class='input' $=input></textarea>
	</details>
</div>
`

Test.prototype.draw_result = function() {
	let e
	if (this.status < 0) {
		e = fail_template()
		let r = this.result
		e.$correct.textContent = safe_string(r.correct)
		e.$got.textContent = safe_string(r.got)
		e.$tree.textContent = r.tree
		e.$result.textContent = r.thing
	} else if (this.status > 0) {
		e = pass_template()
		e.$time.textContent = (+this.parse_time).toFixed(1)+" ms"
	}
	
	e.$name.textContent = this.name
	e.$lang.textContent = this.lang
	e.$input.value = this.input
	
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
