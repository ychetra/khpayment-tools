import {shop,handle,body} from '../../../lib/shop.mjs';
export const runtime='nodejs';
export async function POST(request){return handle(async()=>shop.webhook(await body(request),request.headers.get('khpayment-signature')??''));}
