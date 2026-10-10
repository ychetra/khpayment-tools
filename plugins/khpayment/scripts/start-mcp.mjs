import {readFile,lstat} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

try {
  let stored={};
  const folder=join(homedir(),'.config','khpayment'),file=join(folder,'plugin.json');
  try {
    for(const [path,directory] of [[folder,true],[file,false]]) {
      const stat=await lstat(path);
      if(stat.isSymbolicLink()||(directory?!stat.isDirectory():!stat.isFile()||stat.nlink!==1||stat.size>8192)||(stat.mode&0o077)!==0||(process.getuid&&stat.uid!==process.getuid()))throw new Error('Private configuration required');
    }
    stored=JSON.parse(await readFile(file,'utf8'));
  } catch(error) {if(error.code!=='ENOENT')throw error;}
  const baseUrl=process.env.KHPAYMENT_BASE_URL||stored.baseUrl;
  const apiKey=process.env.KHPAYMENT_API_KEY||stored.apiKey;
  const url=new URL(baseUrl);
  if(url.protocol!=='https:'||url.pathname!=='/'||url.username||url.password||url.search||url.hash||typeof apiKey!=='string'||!/^khp_test_[a-f0-9-]{36}_[A-Za-z0-9_-]{43}$/.test(apiKey))throw new Error('Use an HTTPS origin and test key');
  const entry=fileURLToPath(new URL('../runtime/mcp.mjs',import.meta.url));
  const child=spawn(process.execPath,[entry],{stdio:'inherit',env:{...process.env,KHPAYMENT_BASE_URL:url.origin,KHPAYMENT_API_KEY:apiKey,KHPAYMENT_EXPECTED_ENVIRONMENT:'test',KHPAYMENT_MCP_ALLOW_LIVE_CREATE:'false'}});
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
  child.on('error',()=>{process.stderr.write('KHPayment MCP could not start. Check Node and private configuration.\n');process.exitCode=1;});
  child.on('exit',(code,signal)=>{process.exitCode=code??(signal?1:0);});
} catch {
  process.stderr.write('Configure KHPayment with an HTTPS origin and test key through its private setup command or environment. No secrets were logged.\n');
  process.exitCode=1;
}
