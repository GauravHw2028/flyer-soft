import {Campaign,Template} from './model';
export const esc=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
function lines(s:string,max:number,count:number){const result:string[]=[];for(const paragraph of s.split('\n')){let line='';for(const word of paragraph.split(' ')){if((line+' '+word).trim().length>max&&line){result.push(line);line=word}else line=(line+' '+word).trim()}result.push(line)}return result.slice(0,count).map((s,i)=>i===count-1&&result.length>count?s.slice(0,max-1)+'…':s);}
function text(s:string,x:number,y:number,size:number,fill:string,weight=400,anchor='start'){return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}" direction="${/[\u0600-\u06ff]/.test(s)?'rtl':'ltr'}">${esc(s)}</text>`;}
export function flyerSvg(c:Campaign,t:Template,page=0,images:Record<string,string>={}){if(t.artwork)return studioFlyer(c,t,page,images);const color=t.color,accent=t.accent,minimal=t.style==='minimal',items=c.items.slice(page*t.capacity,(page+1)*t.capacity);let s=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 794 1123" width="794" height="1123" role="img" aria-label="${esc(c.name)}"><rect width="794" height="1123" fill="${minimal?'#fafaf8':'#fff'}"/><g font-family="Arial,Helvetica,sans-serif">`;
 s+=`<rect width="794" height="326" fill="${minimal?'#f0f0eb':color}"/>`;const ink=minimal?color:'#fff';
 if(c.brand.logo)s+=`<image x="35" y="29" width="55" height="42" preserveAspectRatio="xMidYMid meet" href="${esc(images[c.brand.logo]||c.brand.logo)}"/>`;
 s+=text(c.brand.name,c.brand.logo?103:38,58,20,ink,800);s+=text('WEEKLY OFFERS',755,56,12,ink,600,'end');
 const head=lines(c.headline||'Weekly offers',25,3);head.forEach((l,i)=>{s+=text(l,38,132+i*63,Math.min(66,Math.floor(680/Math.max(l.length*.55,1))),minimal?color:accent,900)});
 s+=`<rect x="0" y="282" width="794" height="44" fill="${accent}"/>`;
 const date=(d:string)=>new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
 s+=text(`${date(c.start)} – ${date(c.end)}`,38,310,17,color,700);s+=text('FRESH FINDS. GREAT PRICES.',756,310,12,color,600,'end');
 const cols=t.columns,rows=Math.ceil(t.capacity/cols),gap=12,w=(746-gap*(cols-1))/cols,h=(698-gap*(rows-1))/rows;
 items.forEach((p,i)=>{const x=24+(i%cols)*(w+gap),y=344+Math.floor(i/cols)*(h+gap);s+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${minimal?0:5}" fill="#fff" stroke="${minimal?'#d5d8d2':'#dfe6db'}"/>`;
 const imgH=h-133;if(p.image)s+=`<image x="${x+14}" y="${y+12}" width="${w-28}" height="${imgH}" preserveAspectRatio="xMidYMid meet" href="${esc(images[p.image]||p.image)}"/>`;else s+=text('Add product image',x+w/2,y+imgH/2,14,'#8a948c',400,'middle');
 if(p.badge)s+=`<rect x="${x+8}" y="${y+8}" width="${Math.min(w-16,p.badge.length*7+18)}" height="24" rx="3" fill="${accent}"/>`+text(p.badge.slice(0,24),x+16,y+25,12,color,700);
 const names=lines(p.name,cols===3?24:35,2);names.forEach((l,j)=>{s+=text(l,x+w/2,y+h-108+j*20,cols===3?16:18,'#223128',700,'middle')});
 s+=text(p.pack,x+w/2,y+h-65,13,'#6c796e',400,'middle');
 if(p.price>p.offer){s+=`<text x="${x+w/2}" y="${y+h-44}" font-size="13" fill="#8b928d" text-anchor="middle" text-decoration="line-through">${esc(c.brand.currency)} ${p.price.toFixed(2)}</text>`;}
 s+=text(c.brand.currency,x+13,y+h-14,12,color,600);s+=text(p.offer.toFixed(2),x+w-13,y+h-11,p.offer>9999?32:43,color,900,'end');});
 if(!items.length)s+=text('Add products to start your flyer',397,665,23,'#7e8e82',400,'middle');
 s+=`<rect x="0" y="1059" width="794" height="64" fill="${minimal?'#e9e9e3':color}"/>`;
 s+=text([c.brand.address,c.brand.phone].filter(Boolean).join('  ·  ').slice(0,110),397,1082,13,ink,600,'middle');s+=text(c.brand.terms.slice(0,135),397,1104,10,ink,400,'middle');return s+'</g></svg>';
}
export function campaignIssues(c:Campaign){const errors:string[]=[];if(!c.items.length)errors.push('Add at least one product.');if(c.end<c.start)errors.push('End date must be on or after the start date.');if(!c.name.trim()||!c.brand.name.trim())errors.push('Add a campaign and store name.');if(c.items.some(p=>!p.name.trim()||!Number.isFinite(p.offer)||p.offer<0))errors.push('Check product names and offer prices.');return errors;}
function studioFlyer(c:Campaign,t:Template,page:number,images:Record<string,string>){
 const editorial=t.style==='editorial',compact=t.style==='boutique',cream='#fbf7ee',color=t.color,gold=t.accent;
 const header=editorial?350:compact?292:386,ink=editorial?color:cream;
 const image=(url:string,x:number,y:number,w:number,h:number,crop=false)=>`<image href="${esc(images[url]||url)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${crop?'xMaxYMax slice':'xMidYMid meet'}"/>`;
 let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="794" height="1123" role="img" aria-label="${esc(c.name)}"><rect width="794" height="1123" fill="${cream}"/><g font-family="Arial,Helvetica,sans-serif">`;
 s+=`<rect width="794" height="${header}" fill="${editorial?cream:color}"/>`;
 s+=image(t.artwork!,editorial?405:0,0,editorial?389:794,header,true);
 if(c.brand.logo)s+=image(c.brand.logo,36,27,44,37);
 s+=text(c.brand.name.slice(0,editorial?25:38),c.brand.logo?90:36,51,editorial?14:17,ink,700);
 if(!editorial)s+=text('THE WEEKLY SELECTION',754,49,10,gold,600,'end');
 s+=`<path d="M36 77 H${editorial?360:438}" stroke="${gold}" stroke-width="1" opacity=".7"/>`;
 const title=lines(c.headline||'Good food.\nGreat prices.',editorial?17:23,3),font=editorial?49:compact?48:60;
 title.forEach((l,i)=>{s+=`<g font-family="${editorial?'Georgia,serif':'Arial,Helvetica,sans-serif'}">`+text(l,36,compact?127+i*52:148+i*(editorial?54:65),Math.min(font,Math.floor((editorial?326:450)/(Math.max(l.length,1)*.56))),ink,editorial?400:800)+'</g>'});
 if(!compact)s+=text('A little extraordinary. Every week.',36,header-30,12,editorial?'#8a7057':gold,500);
 const date=(d:string)=>new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
 if(editorial){s+=`<rect x="0" y="${header}" width="794" height="42" fill="${color}"/>`;s+=text(`${date(c.start)} — ${date(c.end)}`,397,header+27,14,cream,500,'middle');}
 else{s+=`<rect x="24" y="${header-18}" width="746" height="42" rx="${compact?0:21}" fill="${gold}"/>`;s+=text(`${date(c.start)} — ${date(c.end)}`,397,header+9,14,color,700,'middle');}
 const start=header+(editorial?84:69),margin=editorial?36:24,gap=editorial?22:12,cols=t.columns,rows=Math.ceil(t.capacity/cols),w=(794-margin*2-gap*(cols-1))/cols,h=(1020-start-gap*(rows-1))/rows;
 s+=text(editorial?'GOOD THINGS, CAREFULLY CHOSEN':compact?'THIS WEEK’S VERY GOOD FINDS':'FRESH FROM YOUR NEIGHBORHOOD',margin,start-20,11,'#806749',600);
 const products=c.items.slice(page*t.capacity,(page+1)*t.capacity);
 products.forEach((p,i)=>{const x=margin+(i%cols)*(w+gap),y=start+Math.floor(i/cols)*(h+gap);
 s+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${editorial?0:9}" fill="#fff" ${editorial?'':'stroke="#eadfcf"'}/>`;
 const picture=h-(compact?112:127);
 if(p.image)s+=image(p.image,x+12,y+10,w-24,picture);else s+=text('Your product image',x+w/2,y+picture/2,13,'#a59483',400,'middle');
 if(p.badge)s+=`<rect x="${x+7}" y="${y+7}" width="${Math.min(w-14,p.badge.length*6+18)}" height="23" rx="11" fill="${gold}"/>`+text(p.badge.slice(0,27),x+15,y+23,11,color,700);
 const name=lines(p.name,cols===2?34:24,2);name.forEach((l,j)=>{s+=text(l,x+14,y+h-(compact?87:102)+j*18,cols===2?19:15,'#362e2b',600)});
 s+=text(p.pack,x+14,y+h-57,12,'#8b7e74',400);
 if(editorial)s+=`<path d="M${x+14} ${y+h-45} H${x+w*.5}" stroke="#eadfcf"/>`;
 if(p.price>p.offer)s+=`<text x="${x+14}" y="${y+h-24}" font-size="12" fill="#9d8e83" text-decoration="line-through">${esc(c.brand.currency)} ${p.price.toFixed(2)}</text>`;
 const price=p.offer.toFixed(2),size=Math.min(editorial?40:compact?30:35,Math.floor((w*.53)/(price.length*.56)));
 s+=text(price,x+w-14,y+h-18,size,color,800,'end');s+=text(c.brand.currency,x+w-14,y+h-48,9,'#8b6c51',600,'end');
 if(editorial)s+=`<rect x="${x}" y="${y+h-3}" width="${w}" height="3" fill="${gold}"/>`;
 });
 if(!products.length)s+=text('Choose your products to fill this page',397,700,20,'#8a7057',400,'middle');
 s+=`<path d="M24 1043 H770" stroke="${gold}"/><rect x="0" y="1059" width="794" height="64" fill="${color}"/>`;
 s+=text([c.brand.address,c.brand.phone].filter(Boolean).join('  ·  ').slice(0,110),397,1082,12,cream,600,'middle');s+=text(c.brand.terms.slice(0,135),397,1103,9,'#dfcdbd',400,'middle');
 return s+'</g></svg>';
}
async function embeddedImages(c:Campaign,t:Template){const map:Record<string,string>={};await Promise.all([...new Set([...c.items.map(p=>p.image),c.brand.logo,t.artwork].filter((url):url is string=>!!url))].map(async url=>{const res=await fetch(url);if(!res.ok)throw new Error('An image could not be loaded. Check your product images.');const blob=await res.blob();map[url]=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(blob)});}));return map;}
export function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export async function exportFlyer(c:Campaign,t:Template,format:'png'|'pdf'|'svg',page=0):Promise<{blob:Blob;name:string}>{const errors=campaignIssues(c);if(errors.length)throw new Error(errors[0]);const imgs=await embeddedImages(c,t),name=c.name.replace(/[^a-zA-Z0-9_-]/g,'-');if(format==='svg')return {blob:new Blob([flyerSvg(c,t,page,imgs)],{type:'image/svg+xml'}),name:`${name}-page-${page+1}.svg`};let pdf:import('jspdf').jsPDF|undefined;if(format==='pdf'){const {jsPDF}=await import('jspdf');pdf=new jsPDF({unit:'mm',format:'a4',compress:true});}
 const pages=Math.max(1,Math.ceil(c.items.length/t.capacity));let png:Blob|undefined;for(let i=format==='pdf'?0:page;i<(format==='pdf'?pages:page+1);i++){const svg=flyerSvg(c,t,i,imgs),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));try{const img=await new Promise<HTMLImageElement>((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Could not render flyer'));im.src=url});const canvas=document.createElement('canvas');canvas.width=2480;canvas.height=3508;const ctx=canvas.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,2480,3508);ctx.drawImage(img,0,0,2480,3508);if(pdf){if(i)pdf.addPage();pdf.addImage(canvas.toDataURL('image/jpeg',.95),'JPEG',0,0,210,297);}else png=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG export failed')),'image/png'));canvas.width=canvas.height=1;}finally{URL.revokeObjectURL(url)}}return {blob:pdf?pdf.output('blob'):png!,name:pdf?name+'.pdf':`${name}-page-${page+1}.png`};}


