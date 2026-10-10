import {createShop} from './lib/core.mjs';
const shop=createShop();try{await shop.setup();console.log('Starter tables and test-key environment verified.');}finally{await shop.pool.end();}
