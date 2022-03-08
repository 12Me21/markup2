function parse2(code) {
	let i = 0
	let lines = []
	while (1) {
		let [ok, next, res] = parse(code, i, null)
		lines.push(res)
		if (ok >= 3)
			break
		i = next
	}
	return lines
}

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
			tree.push(...x) // array
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
	
	function finish(ok, type) {
		flush_text()
		if (type)
			tree = {type: type, contents: tree}
		return [ok, i, tree]
	}
	
	restore(start)
	
	while (c) {
		if (c=="/") {
			if (blocktype=='italic') {
				scan()
				return finish(0, blocktype)
			} else {
				let [ok, next, res] = parse(code, i+1, 'italic')
				if (ok==0) {
					scan()
				} else {
					add_text(c)
					scan()
				}
				insert(res)
				restore(next)
				if (ok >= 2)
					return finish(ok, null)
			}
		} else if (c=='\n') {
			scan()
			return finish(2, null)
		} else {
			add_text(c)
			scan()
		}
	}
	return finish(3, null)
}

// statuses
// 1: ok
// 2: fail
// 3: eol
// 4: eof
