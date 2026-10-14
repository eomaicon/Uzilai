export type Variant = {name:string;category:string;color:string;model?:string};
export type ModelGroup<T> = {key:string;name:string;category:string;variants:T[]};
const normalize=(s:string)=>s.trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');
export function modelKey(v:Variant){return normalize(v.category)+'|'+normalize(v.model||v.name);}
export function groupModels<T extends Variant>(variants:T[]):ModelGroup<T>[]{
 const groups=new Map<string,ModelGroup<T>>();
 for(const variant of variants){const key=modelKey(variant);let group=groups.get(key);if(!group){group={key,name:variant.model||variant.name,category:variant.category,variants:[]};groups.set(key,group);}group.variants.push(variant);}
 return Array.from(groups.values());
}
export function modelColors<T extends Variant>(group:ModelGroup<T>):string[]{return Array.from(new Set(group.variants.map(v=>v.color)));}
