import{r as p,H as d,Y as k,s as c,w as m,aV as t,a0 as g,A as e,x as l,y as o,I as u,a7 as E}from"./chunks/framework.zRNIbzOM.js";import{d as _}from"./chunks/ods.DzJboHmB.js";import"./chunks/theme.B4caGzYu.js";const T=JSON.parse('{"title":"Color Roles","description":"","frontmatter":{},"headers":[],"relativePath":"designTokens/colorRoles.md","filePath":"designTokens/colorRoles.md"}'),y={name:"designTokens/colorRoles.md"},F=p({...y,setup(C){const n=d(()=>Object.values(_).filter(i=>i.name.startsWith("oc-role-"))),r=[{name:"color",title:"Color",type:"slot"},{name:"name",title:"Name",type:"slot"},{name:"value",title:"Value",type:"slot"}];return(i,a)=>{const h=k("oc-table");return m(),c("div",null,[a[0]||(a[0]=t('<h1 id="color-roles" tabindex="-1">Color Roles <a class="header-anchor" href="#color-roles" aria-label="Permalink to &quot;Color Roles&quot;">​</a></h1><p>The design system uses material design color roles to ensure a consistent look and feel across the interface. Please visit the <a href="https://m3.material.io/" target="_blank" rel="noreferrer">official material design documentation</a> for more details on how to use these roles.</p><h2 id="available-roles" tabindex="-1">Available roles <a class="header-anchor" href="#available-roles" aria-label="Permalink to &quot;Available roles&quot;">​</a></h2>',3)),g(h,{fields:r,data:n.value},{color:e(({item:s})=>[u("div",{style:E({backgroundColor:s.value,width:"150px",height:"50px"})},null,4)]),name:e(({item:s})=>[l(o(s.name),1)]),value:e(({item:s})=>[l(o(s.value),1)]),_:1},8,["data"]),a[1]||(a[1]=t(`<h2 id="usage" tabindex="-1">Usage <a class="header-anchor" href="#usage" aria-label="Permalink to &quot;Usage&quot;">​</a></h2><p>You can use these variables in your SCSS files or style blocks:</p><div class="language-scss vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">scss</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">.element</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  color</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">var</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">--oc-role-on-primary</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  background-color</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">var</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">--oc-role-primary</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div>`,3))])}}});export{T as __pageData,F as default};
