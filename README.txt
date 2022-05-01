
THIS FILE IS OUTDATED, DO NOT READ


🔸🔶🟧 EXAMPLE 🟧🔶🔸

═[HTML]══════════════════════════════════════
<link rel=stylesheet href=markup.css>
<script src=parse.js></script>
<script src=render.js></script>
═[JS]════════════════════════════════════════
let element = document.createElement('div')
element.classList.add('🍂')
document.body.append(element)

let text = "/test/ 123"

Markup.convert(text, element)
/* OR: */
let fragment = Markup.convert(text)
element.append(fragment)
═════════════════════════════════════════════

See ❲markup.css❳ for example styles

🔸🔶🟧 SBS CONTENTAPI EXAMPLE 🟧🔶🔸

═[HTML]═════════════════════════════════════════════
<link rel=stylesheet href=markup.css>
<script src=parse.js></script>
<script src=render.js></script>
<script src=legacy.js></script>
═[JS]═══════════════════════════════════════════════
let element = document.createElement('div')
document.body.append(element)

let message = {
	text: "[i]test[/i] 123",
	values: {m: 'bbcode'}
}

Markup.convert_lang(message.text, message.values.m, element)
// result: <div class='🍂'><i>test</i> 123</div>
// (set Markup.css_class to change the class name)
/* OR: */
let fragment = convert_lang(message.text, message.values.m)
element.append(fragment)
element.classList.add('whatever')
════════════════════════════════════════════════════

🔸🔶🟧 FUNCTIONS 🟧🔶🔸

‹ParentElement› = ‹Element› OR ‹DocumentFragment› OR ‹Document›

‹tree› = {type:ENUM(...), ?args:‹Object›, ?content:LIST(‹branch›)}

‹branch› = ‹tree› OR ‹String› OR `true`

‹parser› = FUNCTION(‹String›) ⤑ ‹tree›

📒❲parse.js❳
 ┃
 ┗🏭❲Markup_12y2:CLASS()❳
   ┃
   ┣📜❲.prototype❳
   ┃
   ┗📦❲new❳
     ┃
     ┗📑❲.parse:‹parser›❳
          ⎝parser, outputs a tree

📒❲render.js❳
 ┃
 ┗🏭❲Markup_Render:CLASS()❳
   ┃
   ┣📜❲.prototype❳
   ┃
   ┗📦❲new❳
     ┃
     ┣📑❲.render:FUNCTION(tree‹tree›, ?parent‹ParentNode›) ⤑ ‹ParentNode›❳
     ┃    ⎜renderer, converts the parser's tree into html.
     ┃    ⎜if `parent` is passed, the output is inserted into that node.
     ┃    ⎝otherwise, it creates and returns a new ‹DocumentFragment›
     ┃  
     ┣📑❲.create:DICT ⤑ ❲FUNCTION(...) ⤑ ‹Node›❳❳
     ┃
     ┗📑❲.url_scheme:DICT ⤑ ❲FUNCTION(‹URL›) ⤑ ‹String›❳❳

📒❲legacy.js❳
 ┃
 ┗🏭❲Markup_Langs:CLASS()❳
   ┃
   ┣📜❲.prototype❳
   ┃
   ┗📦❲new❳
     ┃
     ┣📑❲.12y2:‹parser›❳
     ┣📑❲.text:‹parser›❳
     ┣📑❲.12y:‹parser›❳
     ┣📑❲.bbcode:‹parser›❳
     ┗📑❲.plaintext:‹parser›❳

📒❲helpers.js❳
 ┃
 ┣🏭❲SbsLocation:CLASS(‹String›)❳
 ┃ ┃
 ┃ ┣📜❲.prototype❳
 ┃ ┃ ┃
 ┃ ┃ ┗📑❲.toString:FUNCTION() ⤑ ‹String›❳
 ┃ ┃
 ┃ ┗📦❲new❳
 ┃   ┃
 ┃   ┣📑❲.type:‹String›❳
 ┃   ┃
 ┃   ┣📑❲?.id:‹String› OR ‹Number›❳
 ┃   ┃
 ┃   ┣📑❲.query:DICT ⤑ ‹String›❳
 ┃   ┃
 ┃   ┗📑❲?.fragment:‹String›❳
 ┃
 ┗📦❲???:CLASS() extends Markup_Render❳
   ┃
   ┣📜❲.prototype❳
   ┃ ┃
   ┃ ┣📑❲.parse:FUNCTION(‹String›, ‹String›) ⤑ ‹tree›❳
   ┃ ┃
   ┃ ┗📑❲.convert_lang:FUNCTION(‹String›, ‹String›, ?‹Element›, ?TABLE) ⤑ ‹ParentElement›❳
   ┃
   ┗📦❲new❳
     ┃
     ┣📑❲.langs:TABLE ⤑ ‹parser›❳
     ┃    ⎝table of parser functions for different markup languages
     ┃
     ┗📑❲.css_class:‹String›❳
          ⎜The css class used by `Markup.convert_lang`
          ⎝default value: "🍂"

📒❲legacy.js❳
 ┃
 ┣📑❲Markup.convert_lang(text‹String›, ?lang‹String›, ?parent‹Element›, ?settings) ⤑ ‹ParentNode›❳
 ┃    ⎜similar to Markup.convert, but supports other markup languages
 ┃    ⎜(see `Markup.langs`) if `lang` is invalid, 'plaintext' is used.
 ┃    ⎜`Markup.css_class` is added to `parent`'s class list, if passed.
 ┃    ⎝otherwise, creates and returns a new ‹DocumentFragment›
 ┃
 ┣📑❲Markup.css_class ‹String›❳
 ┃    ⎜The css class used by `Markup.convert_lang`
 ┃    ⎝default value: "🍂"
 ┃
 ┗📑❲Markup.langs[‹String›] ⤑ ❲‹Function›(‹String›) ⤑ ‹tree›❳❳
   ┃  ⎜table of parser functions for different markup languages
   ┃  ⎝(all output the same AST format)
   ┃
   ┣ Markup.langs['12y2']
   ┃  ⎝12y2 parser (Markup.parse)
   ┣ Markup.langs['text']
   ┃  ⎝new plaintext parser
   ┣ Markup.langs['12y']
   ┃  ⎝old 12y parser
   ┣ Markup.langs['bbcode']
   ┃  ⎝old bbcode parser
   ┗ Markup.langs['plaintext']
      ⎝old plaintext parser (autolinker)


🔸🔶🟧 FILES 🟧🔶🔸

📚❲./❳
 ┃
 ┣📕❲index.html❳
 ┃    demo page
 ┃
 ┣📔❲README.txt❳
 ┃    readme
 ┣📔❲LICENSE.txt❳
 ┃    license
 ┃
 ┣📒❲parse.js❳
 ┃    parsing (text -> tree)
 ┣📒❲render.js❳
 ┃    rendering (tree -> html (DocumentFragment))
 ┣📒❲legacy.js❳
 ┃    parsers for old sbs markup formats
 ┃
 ┣📘❲markup.css❳
 ┃    example styles for markup
 ┃
 ┗📚❲testing/❳
   ┃  tests
   ┃
   ┣📕❲index.html❳
   ┃    run tests
   ┣📕❲editor.html❳
   ┃    test editing tool
   ┃
   ┣📘❲style.css❳
   ┃    common styles for test pages
   ┣📒❲test.js❳
   ┃    test system
   ┗📒❲draw.js❳
        test output rendering


🔸🔶🟧 CREDITS 🟧🔶🔸

🔸𝟷𝟸
🔸𝔂
🔸𝓬𝓱𝓮𝓻𝓻𝔂
🔸𝓷𝓲𝓬𝓸𝓵𝓮
