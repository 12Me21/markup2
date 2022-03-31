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
	// compare fields
	for (let key in a)
		if (!compare_object(a[key], b[key]))
			return false
	
	return true
}
