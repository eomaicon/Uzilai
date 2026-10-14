import { catalog, productCategories } from './catalog.ts';
export type Product = {id:string; name:string; sku:string; category:string; color:string; size:string; cost:number; price:number; wholesale:number; stock:number; min:number; supplier:string; image?:string; model?:string; active:boolean};
export type Customer = {id:string; name:string; phone:string; city:string; kind:string};
export type Item = {productId:string; name:string; variant:string; qty:number; price:number; cost:number};
export type Sale = {id:string; date:string; customerId:string; customerName:string; kind:string; items:Item[]; discount:number; fee:number; freight:number; shippingCost:number; payment:string; paid:boolean; delivery:string; tracking:string; cancelled:boolean; notes:string};
export type Expense = {id:string; date:string; name:string; category:string; amount:number};
export type Movement = {id:string; date:string; productId:string; qty:number; reason:string};
export type Store = {products:Product[]; customers:Customer[]; sales:Sale[]; expenses:Expense[]; movements:Movement[]};
export type Command = {type:string; data:any; id:string};
export const emptyStore = ():Store => ({products:[],customers:[],sales:[],expenses:[],movements:[]});
export const money = (n:number) => (n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const shortDate = (s:string) => new Date(s+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
export const merchandise = (s:Sale) => s.items.reduce((a,i)=>a+i.qty*i.price,0)-s.discount;
export const total = (s:Sale) => merchandise(s)+s.freight;
export const cost = (s:Sale) => s.items.reduce((a,i)=>a+i.qty*i.cost,0);
export const profit = (s:Sale) => total(s)-cost(s)-s.fee-s.shippingCost;
const fail = (s:string):never => {throw new Error(s)};
const str = (v:any,max=150) => {if(typeof v!=='string'||v.trim().length>max) fail('Texto inválido.'); return v.trim();};
const num = (v:any, min=0,max=100000000) => {if(!Number.isSafeInteger(v)||v<min||v>max) fail('Valor inválido.'); return v as number;};
const date = (v:any) => {if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v+'T12:00:00Z'))||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v) fail('Data inválida.'); return v;};
const required = (v:any) => str(v)||fail('Preencha os campos obrigatórios.');
const option = (v:any,values:string[]) => values.includes(v)?v:fail('Opção inválida.');
export function applyCommand(original:Store,cmd:Command):Store {
 const s:Store=structuredClone(original); const d=cmd.data; const id=required(cmd.id); if(id.length>100) fail('Identificador inválido.');
 if(cmd.type==='product') {
  const existing=s.products.find(p=>p.id===d.id);
  const p:Product={id:existing?.id||id,name:required(d.name),model:str(d.model??existing?.model??d.name),sku:required(d.sku),category:option(d.category,productCategories),color:required(d.color),size:required(d.size),cost:num(d.cost),price:num(d.price,1),wholesale:num(d.wholesale,1),stock:existing?.stock??num(d.stock,0,100000),min:num(d.min,0,100000),supplier:str(d.supplier||''),image:d.image===undefined?(existing?.image||''):(d.image===''?'':catalog.find(c=>c.image===d.image)?.image||fail('Foto inválida.')),active:existing?.active??true};
  if(s.products.some(x=>x.sku.toLowerCase()===p.sku.toLowerCase()&&x.id!==p.id)) fail('Já existe uma peça com esse código SKU.');
  if(existing) s.products[s.products.indexOf(existing)]=p; else {if(s.products.some(x=>x.id===id)) return original; s.products.push(p);}
 } else if(cmd.type==='archive') {const p=s.products.find(p=>p.id===d.id); if(!p) fail('Peça não encontrada.'); p!.active=!p!.active;
 } else if(cmd.type==='stock') {
  if(s.movements.some(x=>x.id===id)) return original;
  const p=s.products.find(p=>p.id===d.id); if(!p) fail('Peça não encontrada.'); const q=num(d.qty,-100000,100000); if(!q||p!.stock+q<0) fail('O estoque não pode ficar negativo.');
  p!.stock+=q; s.movements.unshift({id,date:today(),productId:p!.id,qty:q,reason:required(d.reason)});
 } else if(cmd.type==='customer') {
  const c:Customer={id:d.id||id,name:required(d.name),phone:str(d.phone||'',30),city:str(d.city||'',100),kind:option(d.kind,['Varejo','Revendedor'])};
  const existing=s.customers.find(x=>x.id===c.id); if(existing) s.customers[s.customers.indexOf(existing)]=c; else s.customers.push(c);
 } else if(cmd.type==='sale') {
  if(s.sales.some(x=>x.id===id)) return original;
  if(!Array.isArray(d.items)||!d.items.length||d.items.length>100) fail('Adicione uma peça à venda.');
  const kind=option(d.kind,['Varejo','Atacado']); const seen=new Set<string>();
  const items:Item[]=d.items.map((i:any)=>{ const p=s.products.find(p=>p.id===i.productId&&p.active); if(!p) fail('Peça indisponível.'); if(seen.has(p!.id)) fail('Agrupe as quantidades da mesma peça.'); seen.add(p!.id); const qty=num(i.qty,1,100000); if(qty>p!.stock) fail('Estoque insuficiente para '+p!.name+' ('+p!.size+').'); return {productId:p!.id,name:p!.name,variant:p!.color+' · '+p!.size,qty,price:kind==='Atacado'?p!.wholesale:p!.price,cost:p!.cost}; });
  if(kind==='Atacado'&&items.reduce((a,i)=>a+i.qty,0)<10) fail('O pedido de atacado precisa ter pelo menos 10 peças.');
  const discount=num(d.discount); if(discount>items.reduce((a,i)=>a+i.price*i.qty,0)) fail('O desconto supera o valor das peças.');
  const customer=s.customers.find(c=>c.id===d.customerId); if(d.customerId&&!customer) fail('Cliente não encontrado.');
  if(typeof d.paid!=='boolean') fail('Informe a situação do pagamento.');
  const sale:Sale={id,date:date(d.date),customerId:customer?.id||'',customerName:customer?.name||'Cliente avulso',kind,items,discount,fee:num(d.fee),freight:num(d.freight),shippingCost:num(d.shippingCost),payment:option(d.payment,['Pix','Dinheiro','Cartão','Fiado']),paid:d.paid,delivery:option(d.delivery,['Retirada','A separar','Enviado','Entregue']),tracking:'',cancelled:false,notes:str(d.notes||'',500)};
  items.forEach(i=>s.products.find(p=>p.id===i.productId)!.stock-=i.qty); s.sales.unshift(sale);
 } else if(cmd.type==='paid') { const sale=s.sales.find(x=>x.id===d.id&&!x.cancelled); if(!sale) fail('Venda não encontrada.'); sale!.paid=true;
 } else if(cmd.type==='delivery') {const sale=s.sales.find(x=>x.id===d.id&&!x.cancelled); if(!sale) fail('Venda não encontrada.'); sale!.delivery=option(d.delivery,['Retirada','A separar','Enviado','Entregue']); sale!.tracking=str(d.tracking||'',100);
 } else if(cmd.type==='cancel') {const sale=s.sales.find(x=>x.id===d.id); if(!sale) fail('Venda não encontrada.'); if(sale!.cancelled) return original; sale!.cancelled=true; sale!.items.forEach(i=>{const p=s.products.find(p=>p.id===i.productId); if(p) p.stock+=i.qty;});
 } else if(cmd.type==='expense') {if(s.expenses.some(x=>x.id===id)) return original; s.expenses.unshift({id,date:date(d.date),name:required(d.name),category:option(d.category,['Aluguel','Equipe','Embalagem','Marketing','Impostos','Outros']),amount:num(d.amount,1)});
 } else if(cmd.type==='remove-expense') {s.expenses=s.expenses.filter(x=>x.id!==d.id);
 } else fail('Ação desconhecida.');
 return s;
}
export function demoStore():Store {
 const s=emptyStore();
 s.products=catalog.map((c,i)=>{const short=c.category==='Shorts',jogger=c.category==='Calças';return {id:'p'+i,name:c.name,sku:'UZ-'+String(i+1).padStart(3,'0'),category:c.category,color:c.color,image:c.image,size:i%3===0?'P':i%3===1?'M':'G',cost:short?3800:jogger?7800:9200,price:short?8900:jogger?16900:19900,wholesale:short?6500:jogger?11900:13900,stock:i===2?3:i===4?2:12+i,min:5,supplier:'Fornecedor exemplo',active:true};});
 s.customers=[{id:'c1',name:'Mariana Costa',phone:'',city:'Fortaleza · CE',kind:'Varejo'},{id:'c2',name:'Rafael Almeida',phone:'',city:'Sobral · CE',kind:'Revendedor'},{id:'c3',name:'Ana Beatriz',phone:'',city:'Recife · PE',kind:'Varejo'},{id:'c4',name:'Lucas Ferreira',phone:'',city:'Fortaleza · CE',kind:'Varejo'}];
 const now=today(); const ago=(n:number)=>{const d=new Date(now+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-n);return d.toISOString().slice(0,10);};
 for(let i=0;i<24;i++){const p=s.products[i%s.products.length],c=s.customers[i%4],wh=i%6===1,qty=wh?10:(i%3)+1; s.sales.push({id:'demo'+i,date:ago(Math.floor(i*1.15)),customerId:c.id,customerName:c.name,kind:wh?'Atacado':'Varejo',items:[{productId:p.id,name:p.name,variant:p.color+' · '+p.size,qty,price:wh?p.wholesale:p.price,cost:p.cost}],discount:i%5===0?1000:0,fee:0,freight:c.city.startsWith('Fortaleza')?0:2000,shippingCost:c.city.startsWith('Fortaleza')?0:2000,payment:i%3===0?'Dinheiro':'Pix',paid:i!==1&&i!==3,delivery:i<4?'A separar':'Entregue',tracking:'',cancelled:false,notes:''}); }
 s.expenses=[{id:'e1',date:ago(5),name:'Aluguel da loja',category:'Aluguel',amount:120000},{id:'e2',date:ago(3),name:'Embalagens dos pedidos',category:'Embalagem',amount:18500},{id:'e3',date:ago(10),name:'Campanha no Instagram',category:'Marketing',amount:25000}]; return s;
}
