
THIS FILE IS OUTDATED, DO NOT READ


πΈπΆπ§ EXAMPLE π§πΆπΈ

β[HTML]ββββββββββββββββββββββββββββββββββββββ
<link rel=stylesheet href=markup.css>
<script src=parse.js></script>
<script src=render.js></script>
β[JS]ββββββββββββββββββββββββββββββββββββββββ
let element = document.createElement('div')
element.classList.add('π')
document.body.append(element)

let text = "/test/ 123"

Markup.convert(text, element)
/* OR: */
let fragment = Markup.convert(text)
element.append(fragment)
βββββββββββββββββββββββββββββββββββββββββββββ

See β²markup.cssβ³ for example styles

πΈπΆπ§ SBS CONTENTAPI EXAMPLE π§πΆπΈ

β[HTML]βββββββββββββββββββββββββββββββββββββββββββββ
<link rel=stylesheet href=markup.css>
<script src=parse.js></script>
<script src=render.js></script>
<script src=legacy.js></script>
β[JS]βββββββββββββββββββββββββββββββββββββββββββββββ
let element = document.createElement('div')
document.body.append(element)

let message = {
	text: "[i]test[/i] 123",
	values: {m: 'bbcode'}
}

Markup.convert_lang(message.text, message.values.m, element)
// result: <div class='π'><i>test</i> 123</div>
// (set Markup.css_class to change the class name)
/* OR: */
let fragment = convert_lang(message.text, message.values.m)
element.append(fragment)
element.classList.add('whatever')
ββββββββββββββββββββββββββββββββββββββββββββββββββββ

πΈπΆπ§ FUNCTIONS π§πΆπΈ

βΉParentElementβΊ = βΉElementβΊ OR βΉDocumentFragmentβΊ OR βΉDocumentβΊ

βΉtreeβΊ = {type:ENUM(...), ?args:βΉObjectβΊ, ?content:LIST(βΉbranchβΊ)}

βΉbranchβΊ = βΉtreeβΊ OR βΉStringβΊ OR `true`

βΉparserβΊ = FUNCTION(βΉStringβΊ) β€ βΉtreeβΊ

πβ²parse.jsβ³
 β
 βπ­β²Markup_12y2:CLASS()β³
   β
   β£πβ².prototypeβ³
   β
   βπ¦β²newβ³
     β
     βπβ².parse:βΉparserβΊβ³
          βparser, outputs a tree

πβ²render.jsβ³
 β
 βπ­β²Markup_Render:CLASS()β³
   β
   β£πβ².prototypeβ³
   β
   βπ¦β²newβ³
     β
     β£πβ².render:FUNCTION(treeβΉtreeβΊ, ?parentβΉParentNodeβΊ) β€ βΉParentNodeβΊβ³
     β    βrenderer, converts the parser's tree into html.
     β    βif `parent` is passed, the output is inserted into that node.
     β    βotherwise, it creates and returns a new βΉDocumentFragmentβΊ
     β  
     β£πβ².create:DICT β€ β²FUNCTION(...) β€ βΉNodeβΊβ³β³
     β
     βπβ².url_scheme:DICT β€ β²FUNCTION(βΉURLβΊ) β€ βΉStringβΊβ³β³

πβ²legacy.jsβ³
 β
 βπ­β²Markup_Langs:CLASS()β³
   β
   β£πβ².prototypeβ³
   β
   βπ¦β²newβ³
     β
     β£πβ².12y2:βΉparserβΊβ³
     β£πβ².text:βΉparserβΊβ³
     β£πβ².12y:βΉparserβΊβ³
     β£πβ².bbcode:βΉparserβΊβ³
     βπβ².plaintext:βΉparserβΊβ³

πβ²helpers.jsβ³
 β
 β£π­β²SbsLocation:CLASS(βΉStringβΊ)β³
 β β
 β β£πβ².prototypeβ³
 β β β
 β β βπβ².toString:FUNCTION() β€ βΉStringβΊβ³
 β β
 β βπ¦β²newβ³
 β   β
 β   β£πβ².type:βΉStringβΊβ³
 β   β
 β   β£πβ²?.id:βΉStringβΊ OR βΉNumberβΊβ³
 β   β
 β   β£πβ².query:DICT β€ βΉStringβΊβ³
 β   β
 β   βπβ²?.fragment:βΉStringβΊβ³
 β
 βπ¦β²???:CLASS() extends Markup_Renderβ³
   β
   β£πβ².prototypeβ³
   β β
   β β£πβ².parse:FUNCTION(βΉStringβΊ, βΉStringβΊ) β€ βΉtreeβΊβ³
   β β
   β βπβ².convert_lang:FUNCTION(βΉStringβΊ, βΉStringβΊ, ?βΉElementβΊ, ?TABLE) β€ βΉParentElementβΊβ³
   β
   βπ¦β²newβ³
     β
     β£πβ².langs:TABLE β€ βΉparserβΊβ³
     β    βtable of parser functions for different markup languages
     β
     βπβ².css_class:βΉStringβΊβ³
          βThe css class used by `Markup.convert_lang`
          βdefault value: "π"

πβ²legacy.jsβ³
 β
 β£πβ²Markup.convert_lang(textβΉStringβΊ, ?langβΉStringβΊ, ?parentβΉElementβΊ, ?settings) β€ βΉParentNodeβΊβ³
 β    βsimilar to Markup.convert, but supports other markup languages
 β    β(see `Markup.langs`) if `lang` is invalid, 'plaintext' is used.
 β    β`Markup.css_class` is added to `parent`'s class list, if passed.
 β    βotherwise, creates and returns a new βΉDocumentFragmentβΊ
 β
 β£πβ²Markup.css_class βΉStringβΊβ³
 β    βThe css class used by `Markup.convert_lang`
 β    βdefault value: "π"
 β
 βπβ²Markup.langs[βΉStringβΊ] β€ β²βΉFunctionβΊ(βΉStringβΊ) β€ βΉtreeβΊβ³β³
   β  βtable of parser functions for different markup languages
   β  β(all output the same AST format)
   β
   β£ Markup.langs['12y2']
   β  β12y2 parser (Markup.parse)
   β£ Markup.langs['text']
   β  βnew plaintext parser
   β£ Markup.langs['12y']
   β  βold 12y parser
   β£ Markup.langs['bbcode']
   β  βold bbcode parser
   β Markup.langs['plaintext']
      βold plaintext parser (autolinker)


πΈπΆπ§ FILES π§πΆπΈ

πβ²./β³
 β
 β£πβ²index.htmlβ³
 β    demo page
 β
 β£πβ²README.txtβ³
 β    readme
 β£πβ²LICENSE.txtβ³
 β    license
 β
 β£πβ²parse.jsβ³
 β    parsing (text -> tree)
 β£πβ²render.jsβ³
 β    rendering (tree -> html (DocumentFragment))
 β£πβ²legacy.jsβ³
 β    parsers for old sbs markup formats
 β
 β£πβ²markup.cssβ³
 β    example styles for markup
 β
 βπβ²testing/β³
   β  tests
   β
   β£πβ²index.htmlβ³
   β    run tests
   β£πβ²editor.htmlβ³
   β    test editing tool
   β
   β£πβ²style.cssβ³
   β    common styles for test pages
   β£πβ²test.jsβ³
   β    test system
   βπβ²draw.jsβ³
        test output rendering


πΈπΆπ§ CREDITS π§πΆπΈ

πΈπ·πΈ
πΈπ
πΈπ¬π±π?π»π»π
πΈπ·π²π¬πΈπ΅π?
