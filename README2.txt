use different boxdrawing styles for properties vs params etc.



AST: object
|
+-.type: string
|
+-.args?: object
|
+-.contents?: Array
   |
   +-...: AST or string

Parser: function
|
+- return: AST
|
+- param 0: string

Langs_Mixin: object
|
+-.langs?: object
|  |
|  +-...: Parser
|
+-.default_lang?: Parser



parse.js: file
|
+- Markup_12y2: class implements Langs_Mixin
   |  
   +- this.parse: Parser
   |
   +- this.langs: object
      |
      +-.12y2: Parser



legacy.js: file
|
+-.Markup_Legacy: class implements Langs_Mixin
   |
   +- this.default_lang: Parser
   |
   +- this.langs: object
      |
      +-.12y: Parser
      |
      +-.bbcode: Parser
      |
      +-.plaintext: Parser



langs.js: file
|
+-.Markup_Langs: class
   |
   +- constructor
   |  |
   |  +-.0: Array
   |     |
   |     +-...: Langs_Mixin
   |
   +-.prototype.include: function
   |  |
   |  +- param 0: Langs_Mixin
   |
   +-.prototype.get: function
   |  |
   |  +- return: Parser
   |  |
   |  +- param 0?: string
   |
   +-.prototype.parse: function
   |  |
   |  +- return: AST
   |  |
   |  +- param 0: string
   |  |
   |  +- param 1?: string
   |
   +- this.langs: object(null)
   |
   +- this.default_lang: Parser



render.js: file
|
+-.Markup_Render_Dom: class
   |
   +-.prototype: Object
   |
   +- this
      |
      +-.render: function
      |
      +-.create: Object
      |
      +-.url_scheme: Object



helpers.js: file
|
+-.Markup: Object
   |
   +-.css_class: string = "Markup"
   |
   +-.langs: Markup_Langs
   |
   +-.renderer: Markup_Render_Dom
   |
   +-.convert_lang: function
      |
      +- return: ParentNode
      |
      +- param 0: string
      |
      +- param 1?: string
      |
      +- param 2?: Element
      |
      +- param 3?: object


