import { readFile } from 'node:fs/promises';
import path from 'node:path';
export async function GET(request: Request) {
 const name=new URL(request.url).searchParams.get('name') ?? 'horizontal';
 if(!['horizontal','vertical','square','white','black'].includes(name))return new Response(null,{status:404});
 const bytes=await readFile(path.resolve(process.cwd(),'tests/fixtures/event-covers/generated',name+'.png'));
 return new Response(bytes,{headers:{'Content-Type':'image/png','Cache-Control':'no-store'}});
}
