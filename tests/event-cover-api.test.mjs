import assert from 'node:assert/strict';
import test from 'node:test';
import { createCoverHandler } from '../lib/event-cover-http.ts';
import { EventCoverError } from '../lib/event-covers.ts';
const eventId='d98afce0-d1e2-4fc9-a5ed-e50d547812da', imageId='d98afce0-d1e2-4fc9-a5ed-e50d547812db';
function fixture({ user='owner', failure }={}) {let calls=0;const state={coverRevision:null,cover:null};const service={state:async()=>state,start:async()=>({uploadId:imageId}),operation:async()=>({status:'pending',state}),confirm:async()=>({state}),updateAlt:async()=>state,delete:async()=>state,image:async()=>{if(failure)throw new EventCoverError(failure,'Portada no disponible.');return new Uint8Array([1,2,3]);}};const handle=createCoverHandler({authenticate:async()=>user?{userId:user,readState:service.state}:null,service:()=>{calls++;return service;}});return{handle,calls:()=>calls};}
function request(method='GET',body){return new Request('https://app.test/api',{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});}
for(const action of ['state','start','operation','confirm','patch','delete','image'])test(`${action} requires session`,async()=>{const h=fixture({user:null});const r=await h.handle(action,request(),{eventId,uploadId:imageId,imageId});assert.equal(r.status,401);assert.deepEqual(Object.keys(await r.json()),['error']);assert.equal(h.calls(),0);});
test('invalid identifiers rejected before storage access',async()=>{const h=fixture();assert.equal((await h.handle('publicImage',request(),{eventId:'bad',imageId})).status,404);assert.equal(h.calls(),0);});
for(const body of [{contentType:'image/gif',byteLength:1,expectedRevision:null},{contentType:'image/png',byteLength:5242881,expectedRevision:null},{contentType:'image/png',byteLength:1},{contentType:'image/png',byteLength:1,expectedRevision:null,path:'chosen'}])test(`reject invalid start ${JSON.stringify(body)}`,async()=>{const h=fixture();const r=await h.handle('start',request('POST',body),{eventId});assert.notEqual(r.status,200);assert.equal(Object.keys(await r.json()).join(','),'error');});
test('bounded JSON rejects overflow rather than truncating',async()=>{const h=fixture();assert.equal((await h.handle('confirm',request('POST',JSON.stringify({altText:'a'.repeat(65536)})),{eventId,uploadId:imageId})).status,413);});
test('strict mutation schema and empty description',async()=>{const h=fixture();assert.equal((await h.handle('patch',request('PATCH',{altText:''}),{eventId})).status,400);assert.equal((await h.handle('patch',request('PATCH',{expectedRevision:null,altText:''}),{eventId})).status,200);});
for(const action of ['publicImage','image'])test(`${action} serves unredirected private/no-store WebP`,async()=>{const h=fixture();const r=await h.handle(action,request(),{eventId,imageId});assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),'image/webp');assert.ok(r.headers.get('Cache-Control').includes('no-store'));assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(r.headers.get('Location'),null);});
for(const failure of [404,503])test(`proxy ${failure} is JSON error`,async()=>{const h=fixture({failure});const r=await h.handle('publicImage',request(),{eventId,imageId});assert.equal(r.status,failure);assert.deepEqual(Object.keys(await r.json()),['error']);});
import { projectCoverRow } from '../lib/supabase/event-cover-mapping.ts';
test('metadata projection uses camelCase, always includes imageUrl, and hides paths',()=>{
 const row={revision:eventId,image_id:imageId,object_path:'SECRET/path',alt_text:null,width:600,height:600,content_type:'image/webp'};
 const published=projectCoverRow(eventId,true,row),privateState=projectCoverRow(eventId,false,row);
 assert.equal(published.cover.imageUrl,`/api/eventos/${eventId}/portada/${imageId}`);assert.equal(privateState.cover.imageUrl,null);
 assert.ok(!JSON.stringify(published).includes('SECRET'));assert.equal(projectCoverRow(eventId,true,null).cover,null);
});
test('malformed UTF-8 and malformed JSON are business errors',async()=>{
 const h=fixture();assert.equal((await h.handle('patch',request('PATCH','{'),{eventId})).status,400);
 const r=new Request('https://app.test',{method:'PATCH',headers:{'Content-Type':'application/json'},body:new Uint8Array([255,254])});assert.equal((await h.handle('patch',r,{eventId})).status,400);
});
for(const method of ['patch','delete'])test(`${method} requires revision and returns current state`,async()=>{
 const h=fixture();const verb=method==='patch'?'PATCH':'DELETE';
 assert.equal((await h.handle(method,request(verb,method==='patch'?{altText:'text'}:{}),{eventId})).status,400);
 const r=await h.handle(method,request(verb,{expectedRevision:null,...(method==='patch'?{altText:''}:{})}),{eventId});assert.equal(r.status,200);assert.deepEqual(await r.json(),{coverRevision:null,cover:null});
});
test('provider errors are masked and credentials never enter errors',async()=>{
 const handle=createCoverHandler({authenticate:async()=>{throw new Error('SECRET password');},service:()=>assert.fail()});
 const r=await handle('state',request(),{eventId});assert.equal(r.status,503);assert.ok(!(await r.text()).includes('SECRET'));
});
import { readOwnedEventCoverState } from '../lib/supabase/event-cover-reader.ts';
function metadataClient(result) {
 const queries=[];
 const query={select:columns=>{queries.push(['select',columns]);return query;},eq:(column,value)=>{queries.push(['eq',column,value]);return query;},maybeSingle:async()=>result};
 return {client:{from:table=>{queries.push(['from',table]);return query;}},queries};
}
test('owner state works without creating the privileged Storage service',async()=>{
 const {client,queries}=metadataClient({data:{status:'draft',event_covers:null},error:null});
 const handle=createCoverHandler({authenticate:async()=>({userId:'owner',readState:id=>readOwnedEventCoverState(client,id,'owner')}),service:()=>assert.fail('GET state must not require a service key')});
 const response=await handle('state',request(),{eventId});
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{coverRevision:null,cover:null});
 assert.equal(response.headers.get('Cache-Control'),'private, no-store');
 assert.ok(queries.some(query=>query[0]==='eq'&&query[1]==='owner_id'&&query[2]==='owner'));
 assert.ok(queries.some(query=>query[0]==='eq'&&query[1]==='id'&&query[2]===eventId));
 assert.ok(!queries.find(query=>query[0]==='select')[1].includes('object_path'));
});
for(const result of [{data:null,error:null},{data:null,error:{message:'SECRET provider failure'}}])test(`metadata read preserves ${result.error?'failure':'missing event'} instead of returning an empty cover`,async()=>{
 const {client}=metadataClient(result);
 const handle=createCoverHandler({authenticate:async()=>({userId:'owner',readState:id=>readOwnedEventCoverState(client,id,'owner')}),service:()=>assert.fail()});
 const response=await handle('state',request(),{eventId});
 assert.equal(response.status,result.error?503:404);assert.ok(!(await response.text()).includes('SECRET'));
});
