import{r as d,H as h,Y as c,s as k,w as m,I as a,a0 as u,aV as g,x as t,A as l,y as o,a7 as y}from"./chunks/framework.zRNIbzOM.js";import{d as b}from"./chunks/ods.DzJboHmB.js";import"./chunks/theme.B4caGzYu.js";const T=JSON.parse('{"title":"Color palette","description":"","frontmatter":{},"headers":[],"relativePath":"designTokens/colorPalette.md","filePath":"designTokens/colorPalette.md"}'),E={name:"designTokens/colorPalette.md"},x=d({...E,setup(v){const n=h(()=>Object.values(b).filter(i=>i.name.startsWith("oc-color-"))),r=[{name:"color",title:"Color",type:"slot"},{name:"name",title:"Name",type:"slot"},{name:"value",title:"Value",type:"slot"}];return(i,e)=>{const p=c("oc-table");return m(),k("div",null,[e[0]||(e[0]=a("h1",{id:"color-palette",tabindex:"-1"},[t("Color palette "),a("a",{class:"header-anchor",href:"#color-palette","aria-label":'Permalink to "Color palette"'},"​")],-1)),e[1]||(e[1]=a("p",null,"The design system provides some colors that can be used globally. Currently they are primarily suited for icons.",-1)),e[2]||(e[2]=a("h2",{id:"available-colors",tabindex:"-1"},[t("Available colors "),a("a",{class:"header-anchor",href:"#available-colors","aria-label":'Permalink to "Available colors"'},"​")],-1)),u(p,{fields:r,data:n.value},{color:l(({item:s})=>[a("div",{style:y({backgroundColor:s.value,width:"150px",height:"50px"})},null,4)]),name:l(({item:s})=>[t(o(s.name),1)]),value:l(({item:s})=>[t(o(s.value),1)]),_:1},8,["data"]),e[3]||(e[3]=g(`<h2 id="usage" tabindex="-1">Usage <a class="header-anchor" href="#usage" aria-label="Permalink to &quot;Usage&quot;">​</a></h2><p>You can use these variables in your SCSS files or style blocks:</p><div class="language-scss vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">scss</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">.element</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  color</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">var</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">--oc-role-icon-folder</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div>`,3))])}}});export{T as __pageData,x as default};
