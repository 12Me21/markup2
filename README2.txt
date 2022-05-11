use different boxdrawing styles for properties vs params etc.



Langs_Mixin: object
|
+-.langs?: object
|  |
|  +-...: Parser
|
+-.default_lang?: Parser

Parser: function
|
+- return: AST
|
+- parameters
   |
   +-.0: string



parse.js: file
|
+- Markup_12y2: class implements Langs_Mixin
   |
   +- parameters
   |
   +-.prototype: Object
   |  
   +- this
      |
      +-.parse: Parser
      |
      +-.langs: Object
         |
         +-.12y2: Parser



legacy.js: file
|
+-.Markup_Legacy: class implements Langs_Mixin
   |
   +- parameters
   |
   +-.prototype: Object
   |
   +- this
      |
      +-.default_lang: Parser
      |
      +-.langs: Object
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
   +- parameters
   |  |
   |  +-.0: Array
   |     |
   |     +-...: Langs_Mixin
   |
   +-.prototype: Object
   |  |
   |  +-.include: function
   |  |  |
   |  |  +- parameters
   |  |     |
   |  |     +-.0: Langs_Mixin
   |  |
   |  +-.get: function
   |  |  |
   |  |  +- return: Parser
   |  |  |
   |  |  +- parameters
   |  |     |
   |  |     +- 0?: string
   |  |
   |  +-.parse: function
   |     |
   |     +- return: AST
   |     |
   |     +- par-=--------pppppppppp[[[[[[[[pameters
   |        |
   |        +- 0: string
   |        |
   |        +- 1?: string
   |
   +- this
      |
      +-.langs: object(null)
      |
      +-.default_lang: Parser



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
   |  |
   |  +- value = "Markup" //todo: which
   |
   +-.langs: Markup_Langs
   |
   +-.renderer: Markup_Render_Dom
   |
   +-.convert_lang: function
      |
      +- return: ParentNode
      |
      +- parameters
         |
         +-.0: string
         |
         +-.1?: string
         |
         +-.2?: Element
         |
         +-.3?: object


