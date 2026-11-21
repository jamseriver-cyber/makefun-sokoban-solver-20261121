// Copyright (c) 2026 2pjWaZvWitJQ1LiyvEykMCn3JsXGRRjwK7u6dCMPFQ3Y
import n from"node:fs";function t(n){const t=n.replace(/\r/g,"").split(""),e=t.indexOf("\n")+1,o=[-e,e,-1,1]
;let r=t.indexOf("@");const i=r-r%e,c=n=>Math.floor((n%e-1)/7)+(n<i?0:2);let s="";n:for(let n=0;n<4;n++){
let l=1,f=0,u=0;const d=t.map((t,o)=>" .$*@+".includes(t)?o>=i&&o<i+e?1:c(o)!==n?0:(l<<=1,
"$*".includes(t)&&(f|=l),".*+".includes(t)&&(u|=l),l):0);if(!f)continue;const p=new Set;let a=[[r,f,""]],h=[]
;for(;a.length||h.length;){a.length||(a=h,h=[]);const[n,e,i]=a.pop(),c=e*t.length+n;if(!p.has(c)){if(p.add(c),
e===u&&1===d[n]){s+=i,r=n;continue n}for(const[t,r]of o.entries()){const o=n+r,c=d[o];if(!c)continue;let s=e
;if(e&c){const n=d[o+r];if(!n||1===n||e&n)continue;s^=c|n}(s===e?a:h).push([o,s,i+"udlr"[t]])}}}
throw new Error("No solution for generated room")}return s}
const e=process.env.MAKEFUN_INPUT_DIR??"/input",o=process.env.MAKEFUN_OUTPUT_DIR??"/output"
;for(const r of n.readdirSync(e).sort()){const i=o+"/"+r;n.mkdirSync(i,{recursive:!0}),
n.writeFileSync(i+"/solution.txt",t(n.readFileSync(e+"/"+r+"/level.txt","utf8")))}
