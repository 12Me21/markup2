"use strict"

let PARSER = new Markup_12y2()

function clean(tree) {
	if ('string'==typeof tree)
		return tree
	let ret = {type:tree.type}
	if (tree.args)
		ret.args = tree.args
	if (tree.content)
		ret.content = tree.content.map(x=>clean(x))
	return ret
}

function INIT(th, defs) {
	Object.defineProperties(th, defs)
	Object.seal(th)
}

class Test {
	constructor({name}, input, correct) {
		INIT(this, {
			name: {value: name},
			input: {value: input},
			correct: {value: correct},
			status: {writable: true},
			result: {writable: true},
			parse_time: {writable: true},
		})
		
		this.reset()
		
		if (Test.all.find(test=>test.input == input))
			console.warn('duplicate test!', this)
		Test.all.push(this)
	}
	
	run() {
		this.reset()
		
		let t, p
		try {
			p = performance.now()
			t = PARSER.parse(this.input)
			this.parse_time = performance.now() - p
		} catch (e) {
			this.parse_time = performance.now() - p
			this.status = -2
			this.result = "Error during parsing!\n"+e+"\n"+e.stack
			return false
		}
		
		try {
			let p = new Comparator(this.correct, t)
			p.run()
		} catch (e) {
			this.status = -1
			this.result = e
			return false
		}
		
		this.status = 1
		this.result = "ok"
		return true
	}
	
	reset() {
		this.status = 0
		this.result = null
		this.parse_time = null
	}
	
	to_entry() {
		return `🟩 ${this.name}\n${this.input}\n🟩 ${JSON.stringify(clean(this.correct))}`
	}
	
	static all = []
	
	static run_all() {
		for (let test of this.all) {
			test.run()
		}
	}
	
	static load_text(text) {
		this.all = []
		//let text = await fetch(url).then(x=>x.text())
		text = text.replace(/\r/g, "")
		// todo: indent? (\t*) and then \1 backref match on other lines
		let r = /^🟩[ \t]?(.*)\n([^🟩]*)\n🟩[ \t]*([{].*)$|(🟩)/gum
		let m
		while (m = r.exec(text)) {
			let [, name, input, output, fail] = m
			if (fail) {
				let line = text.substr(0, m.index).match(/\n/g).length+1
				console.warn("error parsing tests file:", line)
			} else {
				let test = new this({name: name}, input, clean(JSON.parse(output)))
			}
		}
	}
}

class InvalidTree extends Error {
	constructor(msg) {
		super(msg)
		this.name = 'InvalidTree'
	}
}

class Mismatch extends Error {
	constructor(msg, correct, got) {
		super(msg)
		this.correct = correct
		this.got = got
		this.message = `${msg}\nExpect: ${safe_string(correct)}\n   Got: ${safe_string(got)}`
		this.name = 'Mismatch'
	}
}

function safe_string(obj) {
	if (obj===undefined)
		return "<empty>"
	try {
		return JSON.stringify(obj)
	} catch(e) {
		return "<???>"
	}
}

// todo: this could be more fancy. integrate it with Test directly. instead of making a new one
// rather than keeping a stack, just add annotations onto `correct` once at the start, then reuse them.
class Comparator {
	constructor(correct, got) {
		this.stack = []
		this.correct = correct
		this.got = got
	}
	run() {
		this.compare_node(this.correct, this.got)
	}
	mismatch(msg, correct, got) {
		throw new Mismatch("\n"+this.print()+msg, correct, got)
	}
	push(correct) {
		this.stack.push({node:correct})
	}
	index(i) {
		this.stack[this.stack.length-1].index = i
	}
	pop() {
		this.stack.pop()
	}
	print() {
		let s = "", i = 0
		for (let {node, index} of this.stack) {
			if (!node)
				break
			index = index==null ? "" : ".content["+(index+1)+"/"+node.content.length+"]"
			node = 'string'==typeof node ? JSON.stringify(node) : node.type
			let prefix = i==0 ? "" : "    ".repeat(i-1)+"└ "
			s += prefix+node+index+"\n"
			i++
		}
		return s
	}
	is_object(x) {
		return x && Object.getPrototypeOf(x)==Object.prototype
	}
	json_type(x) {
		if (x===null || x===undefined) return 'null'
		let t = typeof x
		if (t=='number' || t=='boolean' || t=='string')
			return t
		if (t=='object') {
			if (Array.isArray(x)) return 'array'
			if (this.is_object(x)) return 'object'
		}
		throw new InvalidTree("value has illegal type")
	}
	compare_args(correct, got) {
		if (correct==null) {
			if (got!=null)
				this.mismatch("node.args", correct, got)
			return
		}
		if (!this.is_object(correct)) {
			this.mismatch("reference tree", 'object', correct)
		}
		if (!this.is_object(got))
			this.mismatch("node.args", correct, got)
		
		for (let obj of [correct, got])
			for (let key in obj)
				if (correct[key] !== got[key])
					this.mismatch(`node.args.${key}`, correct[key], got[key])
	}
	compare_content(correct, got) {
		// todo: whether a node has .content depends on the node type
		// i.e. /italic/ always has content, --- <hr> never does, etc.
		// so instead of this check, perhaps we should have a table of which blocks have contents?
		if (correct==null) {
			if (got!=null)
				this.mismatch("node.content", correct, got)
			return
		}
		//
		if (!Array.isArray(correct))
			throw new Error("invalid .content in reference tree")
		if (!Array.isArray(got))
			this.mismatch("node.content", correct, got)
		
		for (let i=0; i<correct.length || i<got.length; i++) {
			this.index(i)
			this.compare_node(correct[i], got[i])
		}
	}
	compare_node(correct, got) {
		this.push(correct)
		// string node
		if ('string'==typeof correct) {
			if (got !== correct)
				this.mismatch("node", correct, got)
		} else {
			// object node
			if (!this.is_object(correct)) {
				this.mismatch("reference tree", 'object', correct)
			}
			if (!this.is_object(got))
				this.mismatch("node", correct, got)
			if (got.type !== correct.type)
				this.mismatch("node.type", correct.type, got.type)
			// 
			this.compare_args(correct.args, got.args)
			// 
			this.compare_content(correct.content, got.content)
		}
		this.pop()
	}
}
