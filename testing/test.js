let PARSER = new Markup_12y2()

class Test {
	constructor({name}, input, correct) {
		Object.defineProperties(this, {
			name: {value: name},
			input: {value: input},
			correct: {value: correct},
			status: {writable: true},
			result: {writable: true},
			parse_time: {writable: true},
		})
		Object.preventExtensions(this)
		
		this.reset()
		
		if (this.constructor.all.find(test=>test.input == input))
			console.warn('duplicate test!', this)
		this.constructor.all.push(this)
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
			compare_node(this.correct, t, new Path())
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
		return `🟩 ${this.name}\n${this.input}\n🟩 ${JSON.stringify(this.correct)}`
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
		let r = /^🟩[ \t]?(.*)\n([^🟩]*)\n🟩[ \t]*({.*)$|(🟩)/mg
		let m, l
		while (m = r.exec(text)) {
			let [, name, input, output, fail] = m
			if (fail) {
				let line = text.substr(0, m.index).match(/\n/g).length+1
				console.warn("error parsing tests file:", line)
			} else {
				let test = new this({name: name}, input, JSON.parse(output))
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

// todo; during the comparison process, keep track of which node in `correct` is being checked, 

class Path {
	constructor() {
		this.stack = []
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
			index = index==null ? "" : ".content["+(index+1)+"/"+node.content.length+"]"
			node = 'string'==typeof node ? JSON.stringify(node) : node.type
			let prefix = i==0 ? "" : "    ".repeat(i-1)+"└ "
			s += prefix+node+index+"\n"
			i++
		}
		return s
	}
}

function is_object(x) {
	return x && Object.getPrototypeOf(x)==Object.prototype
}

function json_type(x) {
	if (x===null || x===undefined) return 'null'
	let t = typeof x
	if (t=='number' || t=='boolean' || t=='string')
		return t
	if (t=='object') {
		if (Array.isArray(x)) return 'array'
		if (is_object(x)) return 'object'
	}
	throw new InvalidTree("value has illegal type")
}

function compare_args(correct, got, path) {
	if (correct==null) {
		if (got!=null)
			path.mismatch("node.args", correct, got)
		return
	}
	if (!is_object(correct))
		throw new Error("invalid reference tree")
	if (!is_object(got))
		path.mismatch("node.args", correct, got)
	
	for (let obj of [correct, got])
		for (let key in obj)
			if (correct[key] !== got[key])
				path.mismatch(`node.args.${key}`, correct[key], got[key])
}

function compare_content(correct, got, path) {
	// todo: whether a node has .content depends on the node type
	// i.e. /italic/ always has content, --- <hr> never does, etc.
	// so instead of this check, perhaps we should have a table of which blocks have contents?
	if (correct==null) {
		if (got!=null)
			path.mismatch("node.content", correct, got)
		return
	}
	//
	if (!Array.isArray(correct))
		throw new Error("invalid .content in reference tree")
	if (!Array.isArray(got))
		path.mismatch("node.content", correct, got)
	
	for (let i=0; i<correct.length || i<got.length; i++) {
		path.index(i)
		compare_node(correct[i], got[i], path, i)
	}
}

function compare_node(correct, got, path) {
	path.push(correct)
	// string node
	if ('string'==typeof correct) {
		if (got !== correct)
			path.mismatch("node", correct, got)
	} else {
		// object node
		if (!is_object(correct))
			throw new Error("invalid reference tree")
		if (!is_object(got))
			path.mismatch("node", correct, got)
		if (got.type !== correct.type)
			path.mismatch("node.type", correct.type, got.type)
		// 
		compare_args(correct.args, got.args, path)
		// 
		compare_content(correct.content, got.content, path)
	}
	path.pop()
}
