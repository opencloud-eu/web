import{r as x,M as C,H as h,z as r,A as d,Y as o,w as a,s as p,X as y,v as w,I as B,B as O,y as z,a0 as F,W as N}from"./framework.zRNIbzOM.js";import"./theme.B4caGzYu.js";const V={key:0,class:"oc-flex"},D=x({__name:"default",setup(g){const e=C(),u=h(()=>[{id:"1",label:"Option 1"},{id:"2",label:"Option 2"},{id:"3",label:"Option 3"}]),m=c=>{e.value=c},_=()=>{e.value=null};return(c,S)=>{var n,s;const f=o("oc-icon"),b=o("oc-button"),v=o("oc-filter-chip");return a(),r(v,{"filter-label":((n=e.value)==null?void 0:n.label)||"Select an option","selected-item-names":(s=e.value)!=null&&s.label?[e.value.label]:[],"close-on-click":"",onClearFilter:_},{default:d(()=>[(a(!0),p(N,null,y(u.value,(t,k)=>{var i;return a(),r(b,{key:k,appearance:"raw",size:"medium","justify-content":"space-between",class:w(["oc-flex oc-flex-middle oc-width-1-1 oc-py-xs oc-px-s",{"oc-secondary-container":t.id===((i=e.value)==null?void 0:i.id)}]),onClick:l=>m(t)},{default:d(()=>{var l;return[B("span",null,z(t.label),1),t.id===((l=e.value)==null?void 0:l.id)?(a(),p("div",V,[F(f,{name:"check"})])):O("",!0)]}),_:2},1032,["class","onClick"])}),128))]),_:1},8,["filter-label","selected-item-names"])}}});export{D as default};
