import {randomBytes,randomUUID,createHash} from 'node:crypto';
import pg from 'pg';
import {createClient,KhPaymentError,verifyWebhook} from '@ychetra/khpayment-node';

// Illustrative shop, deliberately TEST ONLY. Replace the session/catalogue with
// your real application authorization; never derive an authoritative price from a request.
export const catalogue=Object.freeze({notebook:{name:'Notebook',amount:'12.09',currency:'USD'}});
export function createShop(env=process.env){
 const origin=new URL(env.STARTER_ORIGIN).origin;
 if(origin!==env.STARTER_ORIGIN)throw new Error('Set STARTER_ORIGIN to an exact origin');
 const pool=new pg.Pool({connectionString:env.STARTER_DATABASE_URL,max:5,connectionTimeoutMillis:5000});
 const client=createClient({baseUrl:env.KHPAYMENT_BASE_URL,apiKey:env.KHPAYMENT_API_KEY,expectedEnvironment:'test'});
 const hash=token=>createHash('sha256').update(token).digest('hex');
 async function setup(){
  await pool.query(`CREATE TABLE IF NOT EXISTS starter_sessions(id TEXT PRIMARY KEY,expires_at TIMESTAMPTZ NOT NULL);
    CREATE TABLE IF NOT EXISTS starter_orders(id UUID PRIMARY KEY,session_id TEXT NOT NULL REFERENCES starter_sessions(id),sku TEXT NOT NULL,amount TEXT NOT NULL,currency TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,payment_id UUID UNIQUE,state TEXT NOT NULL DEFAULT 'pending',sequence BIGINT NOT NULL DEFAULT 0,
    fulfilled_at TIMESTAMPTZ,lease_until TIMESTAMPTZ,lease_token UUID,next_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS starter_events(id UUID PRIMARY KEY,received_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  const usage=await client.getUsage();if(usage.environment!=='test')throw new Error('A test API key is required');
 }
 async function session(cookie){
  const token=/(?:^|;\s*)starter_session=([A-Za-z0-9_-]{43})(?:;|$)/.exec(cookie??'')?.[1];
  if(!token||!(await pool.query('SELECT 1 FROM starter_sessions WHERE id=$1 AND expires_at>NOW()',[hash(token)])).rowCount)throw new KhPaymentError('Open the shop again to start a session','UNAUTHORIZED',401);
  return hash(token);
 }
 async function newSession(cookie){
  try{await session(cookie);return null;}catch{}
  const token=randomBytes(32).toString('base64url');await pool.query("INSERT INTO starter_sessions(id,expires_at) VALUES($1,NOW()+INTERVAL '1 day')",[hash(token)]);
  return `starter_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${origin.startsWith('https:')?'; Secure':''}`;
 }
 function sameOrigin(value){if(value!==origin)throw new KhPaymentError('Reload the shop and retry','ORIGIN_REJECTED',403);}
 async function checkout(cookie,input){
  const owner=await session(cookie),item=typeof input?.sku==='string'&&Object.hasOwn(catalogue,input.sku)?catalogue[input.sku]:null;if(!item)throw new KhPaymentError('Choose a catalogue item','INVALID_ITEM',400);
  let id=input.orderId;
  if(id&&!/^[a-f0-9-]{36}$/i.test(id))throw new KhPaymentError('Invalid order','INVALID_ORDER',400);
  if(!id)throw new KhPaymentError('Create and retain an order ID before checkout','INVALID_ORDER',400);
  await pool.query('INSERT INTO starter_orders(id,session_id,sku,amount,currency,idempotency_key) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING',[id,owner,input.sku,item.amount,item.currency,randomUUID()]);
  const row=(await pool.query('SELECT * FROM starter_orders WHERE id=$1 AND session_id=$2',[id,owner])).rows[0];if(!row||row.sku!==input.sku)throw new KhPaymentError('Order unavailable','NOT_FOUND',404);
  const token=randomUUID();
  if(!(await pool.query("UPDATE starter_orders SET lease_token=$3,lease_until=NOW()+INTERVAL '30 seconds' WHERE id=$1 AND session_id=$2 AND (lease_until IS NULL OR lease_until<=NOW()) RETURNING id",[id,owner,token])).rowCount)return {orderId:id,state:'creating',checkoutUrl:null,retryAfterSeconds:3};
  try{
   // Idempotency key AND exact fields were committed before dispatch. Creation
   // errors preserve both, including an uncertain POST. Retry is an explicit user action.
   const payment=await client.createPayment({amount:row.amount,currency:row.currency,transactionId:row.id},{idempotencyKey:row.idempotency_key});
   await pool.query('UPDATE starter_orders SET payment_id=$3 WHERE id=$1 AND lease_token=$2',[id,token,payment.id]);
   if(payment.state!=='creating')await applyPayment(id,payment);
   return {orderId:id,state:payment.state,checkoutUrl:payment.state==='creating'?null:payment.checkoutUrl,retryAfterSeconds:3};
  }catch(error){
   if(error instanceof KhPaymentError&&error.paymentId)await pool.query('UPDATE starter_orders SET payment_id=$3 WHERE id=$1 AND lease_token=$2',[id,token,error.paymentId]);
   return {orderId:id,state:'unknown',checkoutUrl:null,retryAfterSeconds:error instanceof KhPaymentError?Math.max(3,error.retryAfterSeconds??3):3,message:'Checkout could not be confirmed. Retry this same order; do not create a replacement.'};
  }finally{await pool.query('UPDATE starter_orders SET lease_token=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2',[id,token]);}
 }
 function matches(row,payment){return row.payment_id===payment.id&&row.id===payment.transactionId&&row.amount===payment.amount&&row.currency===payment.currency&&payment.environment==='test'&&payment.verification==='simulated';}
 async function applyPayment(id,payment,tx=pool,sequence=null){
  const row=(await tx.query('SELECT * FROM starter_orders WHERE id=$1',[id])).rows[0];
  if(!row||!matches(row,payment))throw new KhPaymentError('Payment details do not match this order','PAYMENT_MISMATCH',409);
  // These updates mark only the illustrative TEST order. No real goods are fulfilled.
  await tx.query(`UPDATE starter_orders SET state=$2,fulfilled_at=CASE WHEN $2='paid' THEN COALESCE(fulfilled_at,NOW()) ELSE fulfilled_at END,
    sequence=CASE WHEN $3::bigint IS NULL THEN sequence ELSE $3 END WHERE id=$1 AND (sequence<$3 OR $3::bigint IS NULL)
    AND (state NOT IN ('paid','failed','expired','cancelled') OR state=$2)`,[id,payment.state,sequence]);
 }
 async function status(cookie,id){
  const owner=await session(cookie),row=(await pool.query('SELECT * FROM starter_orders WHERE id=$1 AND session_id=$2',[id,owner])).rows[0];if(!row)throw new KhPaymentError('Order unavailable','NOT_FOUND',404);
  if(!row.payment_id)return {orderId:id,state:'unknown',message:'Use Retry checkout to recover this same order.',checkoutUrl:null};
  if(['paid','failed','expired','cancelled'].includes(row.state))return {orderId:id,state:row.state,checkoutUrl:null};
  const acquired=(await pool.query("UPDATE starter_orders SET next_read_at=NOW()+INTERVAL '3 seconds' WHERE id=$1 AND next_read_at<=NOW() RETURNING id",[id])).rowCount;
  if(!acquired)throw new KhPaymentError('Wait before checking again','RATE_LIMITED',429,null,3);
  try{const payment=await client.getPaymentStatus(row.payment_id);await applyPayment(id,payment);return {orderId:id,state:payment.state,checkoutUrl:payment.checkoutUrl};}
  catch(error){if(error instanceof KhPaymentError&&error.status===429){await pool.query("UPDATE starter_orders SET next_read_at=NOW()+($2*INTERVAL '1 second') WHERE id=$1",[id,Math.max(3,error.retryAfterSeconds??3)]);throw error;}throw error;}
 }
 async function webhook(body,signature){
  const event=verifyWebhook({body,signature,expectedEnvironment:'test',keys:new Map([[env.WEBHOOK_KEY_ID,Buffer.from(env.WEBHOOK_KEY??'','base64url')]])});
  const tx=await pool.connect();try{
   await tx.query('BEGIN');
   const order=(await tx.query('SELECT * FROM starter_orders WHERE payment_id=$1 FOR UPDATE',[event.payment.id])).rows[0];
   if(!order||!matches(order,event.payment))throw new Error('Unmapped or mismatched event');
   const inserted=await tx.query('INSERT INTO starter_events(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id',[event.id]);
   if(inserted.rowCount&&event.sequence>Number(order.sequence))await applyPayment(order.id,event.payment,tx,event.sequence);
   await tx.query('COMMIT');return {accepted:true};
  }catch(error){await tx.query('ROLLBACK');throw error;}finally{tx.release();}
 }
 return {origin,pool,client,setup,session,newSession,sameOrigin,checkout,status,webhook};
}
export function publicError(error){return {status:error instanceof KhPaymentError&&error.status>=400&&error.status<500?error.status:503,
 body:{error:error instanceof KhPaymentError?error.code:'UNAVAILABLE',message:error instanceof KhPaymentError?error.message:'The request could not be completed. Retry later.'},retryAfter:error instanceof KhPaymentError?error.retryAfterSeconds:null};}
