use different boxdrawing styles for properties vs params etc.

parse.js: file
|
+- Markup_12y2: class
   |
   +-.prototype
   |  
   +- this
      |
      +-.parse: function
      |
      +-.langs: Object
         |
         +-.12y2: function

legacy.js: file
|
+- Markup_Legacy: class
   |
   +-.prototype
   |
   +- this
      |
      +-.default_lang: function
      |
      +-.langs: Object
         |
         +-.12y: function
         |
         +-.bbcode: function
         |
         +-.plaintext: function

langs.js: file
|
+- Markup_Langs: class
   |
   +-.prototype
   |  |
   |  +-.include: function
   |  |
   |  +-.get: function
   |  |
   |  +-.parse: function
   |
   +- this
      |
      +-.langs: object
      |
      +-.default_lang: function

render.js: file
|
+- Markup_Render_Dom: class
   |
   +-.prototype
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
+- Markup: Object
   |
   +-.css_class: string
   |
   +-.langs: Markup_Langs
   |
   +-.renderer: Markup_Render_Dom
   |
   +-.convert_lang: function
