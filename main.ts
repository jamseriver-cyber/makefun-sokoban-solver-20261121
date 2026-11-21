// Copyright (c) 2026 2pjWaZvWitJQ1LiyvEykMCn3JsXGRRjwK7u6dCMPFQ3Y
import t from"node:fs";function n(t){const n=t.replace(/\r/g,""),e=n.indexOf("\n")+1,o=Object.entries({u:-e,d:e,
l:-1,r:1});let r=n.indexOf("@");const s=r-r%e,c=t=>Number(t%e>7)+(t<s?0:2);let i="";t:for(let t=0;t<4;t++){
let f=1,l=0,u=0;const d=Array.from(n,(n,o)=>{const r=" .$*@+".indexOf(n)
;return r<0?0:o>=s&&o<s+e?1:c(o)!==t?0:(f<<=1,2&r&&(l|=f),1&r&&(u|=f),f)}),p=new Set
;for(let t=[[r,l,""]];t.length;){const e=[];for(;t.length;){const[s,c,f]=t.pop(),l=c*n.length+s;if(!p.has(l)){
if(p.add(l),c===u&&1===d[s]){i+=f,r=s;continue t}for(const[n,r]of o){const o=s+r,i=d[o];if(!i)continue
;const l=f+n;if(c&i){const t=d[o+r]&~c&-2;t&&e.push([o,c^i^t,l])}else t.push([o,c,l])}}}t=e}
throw new Error("Unsolved room")}return i}
const{MAKEFUN_INPUT_DIR:e="/input",MAKEFUN_OUTPUT_DIR:o="/output"}=process.env
;for(const r of t.readdirSync(e).sort()){const s=o+"/"+r;t.mkdirSync(s,{recursive:!0}),
t.writeFileSync(s+"/solution.txt",n(t.readFileSync(e+"/"+r+"/level.txt","utf8")))}
