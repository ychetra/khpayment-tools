import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createShop,publicError} from './lib/core.mjs';
const shop=createShop(),page=await readFile(new URL('./public/index.html',import.meta.url));
const server=createServer(async(req,res)=>{
 res.setHeader('cache-control','no-store');res.setHeader('referrer-policy','no-referrer');res.setHeader('x-content-type-options','nosniff');res.setHeader('x-frame-options','DENY');
 res.setHeader('content-security-policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
 const send=(body,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(body));};
 try{
  const url=new URL(req.url,shop.origin);if(req.headers.host!==new URL(shop.origin).host)throw new Error('Origin unavailable');
  if(req.method==='GET'&&url.pathname==='/'){res.writeHead(200,{'content-type':'text/html'});res.end(page);return;}
  if(req.method==='GET'&&['/shop.js','/shop.css'].includes(url.pathname)){res.writeHead(200,{'content-type':url.pathname.endsWith('.js')?'application/javascript':'text/css'});res.end(await readFile(new URL('./public'+url.pathname,import.meta.url)));return;}
  let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>65536){send({error:'TOO_LARGE'},413);return;}chunks.push(chunk);}const raw=Buffer.concat(chunks);
  if(req.method==='POST'&&url.pathname==='/api/webhook'){send(await shop.webhook(raw,String(req.headers['khpayment-signature']??'')));return;}
  if(req.method==='POST')shop.sameOrigin(req.headers.origin);
  if(req.method==='POST'&&url.pathname==='/api/session'){const cookie=await shop.newSession(req.headers.cookie);if(cookie)res.setHeader('set-cookie',cookie);send({ready:true});return;}
  if(req.method==='POST'&&url.pathname==='/api/checkout'){send(await shop.checkout(req.headers.cookie,JSON.parse(raw.toString())));return;}
  if(req.method==='GET'&&/^\/api\/orders\/[a-f0-9-]{36}$/i.test(url.pathname)){send(await shop.status(req.headers.cookie,url.pathname.split('/').at(-1)));return;}
  send({error:'NOT_FOUND'},404);
 }catch(error){const result=publicError(error);if(result.retryAfter!==null)res.setHeader('retry-after',String(result.retryAfter));send(result.body,result.status);}
});
server.listen(Number(process.env.PORT??3100),'127.0.0.1',()=>console.log('Starter ready on the configured loopback origin.'));
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>server.close(()=>void shop.pool.end()));
