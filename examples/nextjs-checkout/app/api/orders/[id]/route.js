import {shop,handle} from '../../../../lib/shop.mjs';
export const runtime='nodejs';
export async function GET(request,{params}){return handle(async()=>shop.status(request.headers.get('cookie'),(await params).id));}
