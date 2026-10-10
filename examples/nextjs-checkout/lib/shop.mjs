import 'server-only';
import {createShop,publicError} from './core.mjs';
// Lazy construction keeps build/static analysis free of credentials and connections.
const shop=new Proxy({}, {get(_target,key){const instance=globalThis.khpaymentStarterShop??=createShop();return instance[key];}});
export {shop};
export async function handle(action){try{return Response.json(await action(),{headers:{'cache-control':'no-store'}});}catch(error){const result=publicError(error);return Response.json(result.body,{status:result.status,headers:{'cache-control':'no-store',...(result.retryAfter!==null?{'retry-after':String(result.retryAfter)}:{})}});}}
export async function body(request){
 const reader=request.body?.getReader();if(!reader)return '';
 let size=0;const chunks=[];
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>65536)throw new Error('Body too large');chunks.push(part.value);}return Buffer.concat(chunks).toString('utf8');}
 finally{await reader.cancel();reader.releaseLock();}
}
