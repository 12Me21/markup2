function parse(code, start, blocktype) {
	let tree = []
	let text_buffer = ""
	function add_text(text) {
		text_buffer += text
	}
	function flush_text() {
		if (text_buffer) {
			tree.push(text_buffer)
			text_buffer = ""
		}
	}
	
	function insert(x) {
		flush_text()
		if (x instanceof Array)
			tree.concat(x) // array
		else
			tree.push(x) // object or text
	}
	
	let c
	function scan() {
		i++
		c = code.charAt(i)
	}
	// is this safe? when we start dealing with like linebreaks idk
	function restore(pos) {
		i = pos-1
		scan()
	}
	
	function finish(ok, thing) {
		flush_text()
		return [ok, i, thing]
	}
	
	restore(start)
	
	while (c) {
		if (c=="/") {
			if (blocktype=='italic') {
				scan()
				return finish(true, {type: blocktype, contents: tree})
			} else {
				let [ok, next, res] = parse(code, i+1, 'italic')
				if (!ok) {
					add_text(c)
					scan()
				} else {
					scan()
				}
				insert(res)
				restore(next)
			}
		} else {
			add_text(c)
			scan()
		}
	}
	return finish(blocktype==null, tree)
}
