import {mkdir,writeFile,lstat} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';

try {
  let text='';for await(const chunk of process.stdin){text+=chunk;if(text.length>8192)throw new Error('Input too large');}
  const value=JSON.parse(text),url=new URL(value.baseUrl);
  if(url.protocol!=='https:'||url.pathname!=='/'||url.username||url.password||url.search||url.hash)throw new Error('Use an HTTPS origin');
  if(typeof value.apiKey!=='string'||!/^khp_test_[a-f0-9-]{36}_[A-Za-z0-9_-]{43}$/.test(value.apiKey))throw new Error('Use a test key');
  const folder=join(homedir(),'.config','khpayment');await mkdir(folder,{recursive:true,mode:0o700});
  const stat=await lstat(folder);
  if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o077)!==0||(process.getuid&&stat.uid!==process.getuid()))throw new Error('Private directory required');
  await writeFile(join(folder,'plugin.json'),JSON.stringify({baseUrl:url.origin,apiKey:value.apiKey})+'\n',{mode:0o600,flag:'wx'});
  process.stdout.write('Private test configuration saved. Restart the agent to connect KHPayment.\n');
} catch {
  process.stderr.write('Configuration not saved. Supply an HTTPS origin and test key through stdin. Existing configuration must be rotated explicitly.\n');
  process.exitCode=1;
}
