import{_ as n,Y as h,s as E,w as p,aV as r,a0 as a,I as i,A as e,x as s}from"./chunks/framework.zRNIbzOM.js";import"./chunks/theme.B4caGzYu.js";const b=JSON.parse('{"title":"OcSelect component","description":"","frontmatter":{"title":"OcSelect component","next":false,"prev":false},"headers":[],"relativePath":"components/OcSelect.md","filePath":"components/OcSelect/OcSelect.md"}'),d={name:"components/OcSelect.md"};function g(o,l,c,y,F,u){const t=h("live-code-block"),k=h("component-api");return p(),E("div",null,[l[4]||(l[4]=r('<h1 id="ocselect-component" tabindex="-1">OcSelect component <a class="header-anchor" href="#ocselect-component" aria-label="Permalink to &quot;OcSelect component&quot;">​</a></h1><h2 id="description" tabindex="-1">Description <a class="header-anchor" href="#description" aria-label="Permalink to &quot;Description&quot;">​</a></h2><p>The <code>OcSelect</code> component displays a select input field based on <a href="https://vue-select.org/" target="_blank" rel="noreferrer">Vue Select</a>. A more detailed description can be found in the <a href="https://vue-select.org/" target="_blank" rel="noreferrer">Vue Select documentation</a>.</p><h2 id="accessibility" tabindex="-1">Accessibility <a class="header-anchor" href="#accessibility" aria-label="Permalink to &quot;Accessibility&quot;">​</a></h2><p>The label is required and represents the name of the input. It can be visually hidden on the screen by setting <code>label-hidden</code> to <code>true</code>, however it will still be read by screen readers.</p><h2 id="examples" tabindex="-1">Examples <a class="header-anchor" href="#examples" aria-label="Permalink to &quot;Examples&quot;">​</a></h2><h3 id="default" tabindex="-1">Default <a class="header-anchor" href="#default" aria-label="Permalink to &quot;Default&quot;">​</a></h3><p>The most basic use case requires the <code>label</code> property and usually has a <code>v-model</code> to bind the selected value and some options.</p>',8)),a(t,{path:"/components/OcSelect/default.vue"},{default:e(()=>l[0]||(l[0]=[i("div",{class:"language-vue vp-adaptive-theme"},[i("button",{title:"Copy Code",class:"copy"}),i("span",{class:"lang"},"vue"),i("pre",{class:"shiki shiki-themes github-light github-dark vp-code",tabindex:"0"},[i("code",null,[i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"<"),i("span",{style:{"--shiki-light":"#22863A","--shiki-dark":"#85E89D"}},"template"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},">")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"  <"),i("span",{style:{"--shiki-light":"#22863A","--shiki-dark":"#85E89D"}},"oc-select"),i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}}," v-model"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"="),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"'),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"option"),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"'),i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}}," label"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"="),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"Please select an option"'),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}}," :"),i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}},"options"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"="),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"'),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"options"),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"'),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}}," />")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"  <"),i("span",{style:{"--shiki-light":"#22863A","--shiki-dark":"#85E89D"}},"p"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},">Selected option: {{ option }}</"),i("span",{style:{"--shiki-light":"#22863A","--shiki-dark":"#85E89D"}},"p"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},">")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"</"),i("span",{style:{"--shiki-light":"#22863A","--shiki-dark":"#85E89D"}},"template"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},">")]),s(`
`),i("span",{class:"line"}),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"<"),i("span",{style:{"--shiki-light":"#22863A","--shiki-dark":"#85E89D"}},"script"),i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}}," setup"),i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}}," lang"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"="),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"ts"'),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},">")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#D73A49","--shiki-dark":"#F97583"}},"import"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}}," { ref } "),i("span",{style:{"--shiki-light":"#D73A49","--shiki-dark":"#F97583"}},"from"),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}}," 'vue'")]),s(`
`),i("span",{class:"line"}),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#D73A49","--shiki-dark":"#F97583"}},"const"),i("span",{style:{"--shiki-light":"#005CC5","--shiki-dark":"#79B8FF"}}," option"),i("span",{style:{"--shiki-light":"#D73A49","--shiki-dark":"#F97583"}}," ="),i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}}," ref"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"()")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#D73A49","--shiki-dark":"#F97583"}},"const"),i("span",{style:{"--shiki-light":"#005CC5","--shiki-dark":"#79B8FF"}}," options"),i("span",{style:{"--shiki-light":"#D73A49","--shiki-dark":"#F97583"}}," ="),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}}," [")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"  { value: "),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},"'1'"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},", label: "),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},"'Option 1'"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}}," },")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"  { value: "),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},"'2'"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},", label: "),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},"'Option 2'"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}}," },")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"  { value: "),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},"'3'"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},", label: "),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},"'Option 3'"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}}," }")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"]")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"</"),i("span",{style:{"--shiki-light":"#22863A","--shiki-dark":"#85E89D"}},"script"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},">")])])])],-1)])),_:1}),l[5]||(l[5]=i("h3",{id:"multiple",tabindex:"-1"},[s("Multiple "),i("a",{class:"header-anchor",href:"#multiple","aria-label":'Permalink to "Multiple"'},"​")],-1)),l[6]||(l[6]=i("p",null,[s("Multiple options can be selected by setting "),i("code",null,"multiple"),s(" to "),i("code",null,"true"),s(".")],-1)),a(t,{path:"/components/OcSelect/multiple.vue"},{default:e(()=>l[1]||(l[1]=[i("div",{class:"language-vue vp-adaptive-theme"},[i("button",{title:"Copy Code",class:"copy"}),i("span",{class:"lang"},"vue"),i("pre",{class:"shiki shiki-themes github-light github-dark vp-code",tabindex:"0"},[i("code",null,[i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"<"),i("span",{style:{"--shiki-light":"#22863A","--shiki-dark":"#85E89D"}},"template"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},">")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"  <"),i("span",{style:{"--shiki-light":"#22863A","--shiki-dark":"#85E89D"}},"oc-select")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}},"    v-model"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"="),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"'),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"selectedOptions"),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"')]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}},"    label"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"="),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"Please select one or more options"')]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"    :"),i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}},"options"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"="),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"'),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"options"),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"')]),s(`
`),i("span",{class:"line highlighted"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"    :"),i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}},"multiple"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"="),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"'),i("span",{style:{"--shiki-light":"#005CC5","--shiki-dark":"#79B8FF"}},"true"),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"')]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"  />")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"  <"),i("span",{style:{"--shiki-light":"#22863A","--shiki-dark":"#85E89D"}},"p"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},">Selected options: {{ selectedOptions }}</"),i("span",{style:{"--shiki-light":"#22863A","--shiki-dark":"#85E89D"}},"p"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},">")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"</"),i("span",{style:{"--shiki-light":"#22863A","--shiki-dark":"#85E89D"}},"template"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},">")]),s(`
`),i("span",{class:"line"}),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"<"),i("span",{style:{"--shiki-light":"#22863A","--shiki-dark":"#85E89D"}},"script"),i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}}," setup"),i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}}," lang"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"="),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"ts"'),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},">")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#D73A49","--shiki-dark":"#F97583"}},"import"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}}," { ref } "),i("span",{style:{"--shiki-light":"#D73A49","--shiki-dark":"#F97583"}},"from"),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}}," 'vue'")]),s(`
`),i("span",{class:"line"}),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#D73A49","--shiki-dark":"#F97583"}},"const"),i("span",{style:{"--shiki-light":"#005CC5","--shiki-dark":"#79B8FF"}}," selectedOptions"),i("span",{style:{"--shiki-light":"#D73A49","--shiki-dark":"#F97583"}}," ="),i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}}," ref"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"([])")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#D73A49","--shiki-dark":"#F97583"}},"const"),i("span",{style:{"--shiki-light":"#005CC5","--shiki-dark":"#79B8FF"}}," options"),i("span",{style:{"--shiki-light":"#D73A49","--shiki-dark":"#F97583"}}," ="),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}}," [")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"  { value: "),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},"'1'"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},", label: "),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},"'Option 1'"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}}," },")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"  { value: "),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},"'2'"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},", label: "),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},"'Option 2'"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}}," },")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"  { value: "),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},"'3'"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},", label: "),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},"'Option 3'"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}}," }")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"]")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"</"),i("span",{style:{"--shiki-light":"#22863A","--shiki-dark":"#85E89D"}},"script"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},">")])])])],-1)])),_:1}),l[7]||(l[7]=i("h3",{id:"states",tabindex:"-1"},[s("States "),i("a",{class:"header-anchor",href:"#states","aria-label":'Permalink to "States"'},"​")],-1)),l[8]||(l[8]=i("p",null,[s("The component can be in a "),i("code",null,"disabled"),s(" or a "),i("code",null,"loading"),s(" state.")],-1)),a(t,{path:""},{default:e(()=>l[2]||(l[2]=[i("div",{class:"language-html vp-adaptive-theme"},[i("button",{title:"Copy Code",class:"copy"}),i("span",{class:"lang"},"html"),i("pre",{class:"shiki shiki-themes github-light github-dark vp-code",tabindex:"0"},[i("code",null,[i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"<"),i("span",{style:{"--shiki-light":"#22863A","--shiki-dark":"#85E89D"}},"oc-select")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}},"	label"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"="),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"Please select an option"')]),s(`
`),i("span",{class:"line highlighted"},[i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}},"	disabled")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}},"	class"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"="),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"oc-mb-m"')]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"/>")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"<"),i("span",{style:{"--shiki-light":"#22863A","--shiki-dark":"#85E89D"}},"oc-select")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}},"	label"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"="),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"Please select an option"')]),s(`
`),i("span",{class:"line highlighted"},[i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}},"	loading")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}},"	class"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"="),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"oc-mb-m"')]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"/>")])])])],-1)])),_:1}),l[9]||(l[9]=i("h3",{id:"messages",tabindex:"-1"},[s("Messages "),i("a",{class:"header-anchor",href:"#messages","aria-label":'Permalink to "Messages"'},"​")],-1)),l[10]||(l[10]=i("p",null,[s("There are two different types of messages that can be displayed: "),i("code",null,"description-message"),s(" and "),i("code",null,"error-message"),s(".")],-1)),a(t,{path:""},{default:e(()=>l[3]||(l[3]=[i("div",{class:"language-html vp-adaptive-theme"},[i("button",{title:"Copy Code",class:"copy"}),i("span",{class:"lang"},"html"),i("pre",{class:"shiki shiki-themes github-light github-dark vp-code",tabindex:"0"},[i("code",null,[i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"<"),i("span",{style:{"--shiki-light":"#22863A","--shiki-dark":"#85E89D"}},"oc-select")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}},"	label"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"="),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"Please select an option"')]),s(`
`),i("span",{class:"line highlighted"},[i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}},"	description-message"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"="),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"This is a description message"')]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}},"	class"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"="),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"oc-mb-m"')]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"/>")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"<"),i("span",{style:{"--shiki-light":"#22863A","--shiki-dark":"#85E89D"}},"oc-select")]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}},"	label"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"="),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"Please select an option"')]),s(`
`),i("span",{class:"line highlighted"},[i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}},"	error-message"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"="),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"This is an error message"')]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#6F42C1","--shiki-dark":"#B392F0"}},"	class"),i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"="),i("span",{style:{"--shiki-light":"#032F62","--shiki-dark":"#9ECBFF"}},'"oc-mb-m"')]),s(`
`),i("span",{class:"line"},[i("span",{style:{"--shiki-light":"#24292E","--shiki-dark":"#E1E4E8"}},"/>")])])])],-1)])),_:1}),a(k)])}const B=n(d,[["render",g]]);export{b as __pageData,B as default};
