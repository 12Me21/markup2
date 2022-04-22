type MarkupAST = Object

type Parsers = {
	[key: string]: (input: string) => MarkupAST
}

export class Markup_Langs {
	constructor(langs: Parsers);
}