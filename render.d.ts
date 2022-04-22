import type { MarkupAST } from "./langs";

export class Markup_Render_Html {
	render(args: MarkupAST, node=document.createDocumentFragment()): DocumentFragment
}
