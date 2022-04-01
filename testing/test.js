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
			t = Markup.parse(this.input)
			this.parse_time = performance.now() - p
		} catch (e) {
			this.parse_time = performance.now() - p
			this.status = -2
			this.result = "Error during parsing!\n"+e+"\n"+e.stack
			return false
		}
		
		try {
			compare_node(this.correct, t)
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
		this.message = `${msg}\nExpect: ${correct}\n   Got: ${got}`
		this.name = 'Mismatch'
	}
}

function safe_string(obj) {
	try {
		return JSON.stringify(obj)
	} catch(e) {
		return "<???>"
	}
}

// todo; during the comparison process, keep track of which node in `correct` is being checked, 

function simple_type(x) {
	if (x===null)
		return 'null'
	let t = typeof x
	if (t=='number' || t=='undefined' || t=='boolean' || t=='string')
		return t
	if (t=='object') {
		let p = Object.getPrototypeOf(x)
		if (p==Object.prototype)
			return 'object'
		if (p==Array.prototype)
			return 'array'
	}
	throw new InvalidTree("value has illegal type")
}

function is_object(x) {
	return x && Object.getPrototypeOf(x) == Object.prototype
}

function compare_object(correct, got) {
	// simple comparison (primitive)
	if (correct === got)
		return true
	if (is_object(correct)) {
		if (!is_object(got))
			return false
	} else if (Array.isArray(correct)) {
		if (!Array.isArray(got))
			return false
		if (correct.length != got.length)
			return false
	} else {
		return false
	}
	
	let n = 0
	for (let key in correct)
		if (correct[key] !== undefined) {
			if (!compare_object(correct[key], got[key]))
				return false
			n++
		}
	
	for (let key in got)
		if (got[key] !== undefined)
			n--
	
	if (n!=0)
		return false
		
	return true
}

function node_kind(node) {
	if (typeof node == 'string')
		return 'text'
	if (node == true)
		return 'newline'
	if (!is_object(node))
		throw new InvalidTree("illegal node")
	if (typeof node.type != 'string')
		throw new InvalidTree("illegal node.type")
	return 'block'
}

function compare_node_types(correct, got) {
	let type = node_kind(got)
	// text
	if (typeof correct == 'string') {
		if (type != 'text')
			throw new Mismatch("wrong node kind", 'text', type)
		if (correct != got)
			throw new Mismatch("wrong text", correct, got)
	// newline
	} else if (correct == true) {
		if (type != 'newline')
			throw new Mismatch("wrong node kind", 'newline', type)
	// block
	} else {
		if (type != 'block')
			throw new Mismatch("wrong node kind", 'block', type)
		if (correct.type != got.type)
			throw new Mismatch("wrong block type", correct.type, got.type)
	}
	return true
}

function has_content(node) {
	if (node.content===undefined)
		return false
	if (Array.isArray(node.content))
		return true
	throw new InvalidTree(".content field is not array")
}

function compare_content(correct, got) {
	
	if (got.content===undefined)
		return false

	let got_content = has_content(got)
	
	// no content
	// todo: whether a node has .content depends on the node type
	// i.e. /italic/ always has content, --- <hr> never does, etc.
	// so instead of this check, perhaps we should have a table of which blocks have contents?
	if (!correct.content) {
		if (got_content)
			throw new Mismatch("wrong children", "(none)", "(array)")
	} else {
		if (!got_content)
			throw new Mismatch("wrong children", "(array)", "(none)")
		if (correct.content.length != got.content.length)
			throw new Mismatch("wrong children length", correct.content.length, got.content.length)
		for (let i=0; i<correct.content.length; i++)
			compare_node(correct.content[i], got.content[i])
	}
}

function compare_node(correct, got) {
	compare_node_types(correct, got)
	
	if (!compare_object(correct.args, got.args)) {
		console.info(correct.args, got.args)
		throw new Mismatch("arg mismatch", JSON.stringify(correct.args), safe_string(got.args))
	}
	
	compare_content(correct, got)
}
