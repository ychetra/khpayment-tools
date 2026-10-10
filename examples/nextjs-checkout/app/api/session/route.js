import {shop,handle} from '../../../lib/shop.mjs';
export const runtime='nodejs';
export async function POST(request){let cookie;const response=await handle(async()=>{shop.sameOrigin(request.headers.get('origin'));cookie=await shop.newSession(request.headers.get('cookie'));return {ready:true};});if(cookie)response.headers.set('set-cookie',cookie);return response;}
