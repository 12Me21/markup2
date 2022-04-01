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
			compare_node(t, this.correct)
		} catch (e) {
			this.status = -1
			this.result = "wrong output!\n"+e
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
	
	static all = []
	
	static run_all() {
		for (let test of this.all) {
			test.run()
		}
	}
}

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
	throw 'illegal type'
}

function is_object(x) {
	return x && Object.getPrototypeOf(x) == Object.prototype
}

function compare_object(a, b) {
	// simple comparison
	if (a === b)
		return true
	// passes if both are objects
	if (!(a && b && typeof a == 'object' && typeof b == 'object'))
		return false
	// get prototypes
	let ap = Object.getPrototypeOf(a)
	let bp = Object.getPrototypeOf(b)
	if (ap != bp)
		return false
	// passes if both are arrays (with same length), or simple objects
	if (ap == Array.prototype) {
		if (ap.length != bp.length)
			return false
	} else if (ap != Object.prototype)
		return false
	// compare fields (note that we always use `in` even for arrays, since we might have an array with extra fields)
	for (let key in a)
		if (!compare_object(a[key], b[key]))
			return false
	// todo: check for extra keys in `b` ?
	
	return true
}

function compare_node_types(correct, got) {
	if (typeof correct == 'string') {
		if (typeof got != 'string')
			throw "expected text, got something else"
		if (correct != got)
			throw "wrong text: "
	} else if (correct == true) {
		if (got != true)
			throw "wrong text: "
	} else {
		if (!is_object(got))
			throw "expected object node"
		if (typeof got.type != 'string')
			throw "node type must be string"
		if (correct.type != got.type)
			throw "wrong type"
	}
	return true
}

function has_content(node) {
	if (node.content===undefined)
		return false
	if (Array.isArray(node.content))
		return true
	throw "invalid content type"
}

function compare_node(correct, got) {
	compare_node_types(correct, got)
	
	if (!compare_object(correct.args, got.args)) {
		console.info(correct.args, got.args)
		throw 'arg mismatch'
	}
	
	let got_content = has_content(got)
	// no content
	// todo: whether a node has .content depends on the node type
	// i.e. /italic/ always has content, --- <hr> never does, etc.
	// so instead of this check, perhaps we should have a table of which blocks have contents?
	if (!correct.content) {
		if (!got_content)
			return true
		throw "expected no content"
	}
	
	if (!got_content)
		throw "expected content, got none"
	if (correct.content.length != got.content.length)
		throw "wrong number of children"
	for (let i=0; i<correct.content.length; i++)
		compare_node(correct.content[i], got.content[i])
}
