//correct output generated using:
// copy( JSON.stringify(Markup.parse(`/italic/`)) ) etc.

// the only fields that matter are type/args/content (tag/body are ignored currently)

new Test(
	{name: "abc"},
	`abc`,
	{type:"ROOT",tag:"",content:["abc"]}
)

new Test(
	{name: "should fail"},
	`abc`,
	{type:"ROOT",tag:"",content:["abcd"]}
)

new Test(
	{name: "italic"},
	`/italic/`,
	{type:"ROOT",tag:"",content:[{type:"italic",tag:"/",content:["italic"]}]}
)

new Test(
	{name: "unclosed italic"},
	`/italic`,
	{"type":"ROOT","tag":"","content":["/","italic"]} // not normalized‥
)

new Test(
	{name: "table"},
	`| one | two |
|[2x] oatmeal |`,
	{type:"ROOT",tag:"",content:[{type:"table",tag:"",content:[{type:"table_row",tag:"",content:[{type:"table_cell",tag:"| ",content:["one"],args:{}},{type:"table_cell",tag:" ",content:["two"],args:{}}]},{type:"table_row",tag:"",content:[{type:"table_cell",tag:" |\n|[2x] ",content:["oatmeal"],args:{colspan:2}}]}]}]}
)

new Test(
	{name: "empty"},
	``,
	{type:"ROOT",tag:"",content:[]}
)

new Test(
	{name: "one newline"},
	`
`,
	{type:"ROOT",tag:"",content:[true]}
)

new Test(
	{name: "link"},
	`https://example.com`,
	{"type":"ROOT","tag":"","content":[{"type":"simple_link","tag":"https://example.com","args":{"url":"https://example.com","text":"https://example.com"}}]}
)

new Test(
	{name: "link with label"},
	`https://example.com[heck]`,
	{"type":"ROOT","tag":"","content":[{"type":"simple_link","tag":"https://example.com[heck]","args":{"url":"https://example.com","text":"heck"}}]}
)

new Test(
	{name: "link with empty args"},
	`https://example.com[]`,
	{"type":"ROOT","tag":"","content":[{"type":"simple_link","tag":"https://example.com[]","args":{"url":"https://example.com","text":"https://example.com"}}]}
)

new Test(
	{name: "link with blank label"},
	`https://example.com[=]`,
	{"type":"ROOT","tag":"","content":[{"type":"simple_link","tag":"https://example.com[=]","args":{"url":"https://example.com","text":""}}]}
)

new Test(
	{name: "link with blank label 2"},
	`https://example.com[;]`,
	{"type":"ROOT","tag":"","content":[{"type":"simple_link","tag":"https://example.com[;]","args":{"url":"https://example.com","text":""}}]}
)
