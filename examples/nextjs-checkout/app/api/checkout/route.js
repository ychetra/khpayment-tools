import {shop,handle,body} from '../../../lib/shop.mjs';
export const runtime='nodejs';
export async function POST(request){return handle(async()=>{shop.sameOrigin(request.headers.get('origin'));return shop.checkout(request.headers.get('cookie'),JSON.parse(await body(request)));});}
