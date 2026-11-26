import test from 'node:test';
import assert from 'node:assert/strict';
import { EventCoverService } from '../lib/event-cover-service.ts';
const ownerId='owner', eventId='event', uploadId='upload';
function fixture({ failAt, cleanupFails=false, committed=false }={}) {
  const calls=[]; let state={coverRevision:'old',cover:{imageId:'old',altText:'Anterior',width:600,height:600,contentType:'image/webp',imageUrl:null}};
  const upload={ id:uploadId, ownerId,eventId,status:'pending',expiresAt:'2027-01-01T00:00:00Z', stagingPath:'staging',declaredByteLength:3,claimToken:'claim',candidatePath:'candidate',committedRevision:null };
  const deps={ now:()=>0,event:async()=>({ownerId,published:false,state,objectPath:'old'}),operation:async()=>upload,
    mutate:async(action,args)=>{calls.push({action,args});if(failAt===action)throw new Error('SECRET');if(action==='claim'&&committed)return{code:'COMMITTED',committedRevision:'original',state};if(action==='commit'){state={...state,coverRevision:'new'};return{code:'SUCCESS',committedRevision:'new',state};}return{code:'SUCCESS',upload,state};},
    sign:async()=> 'token',download:async()=>{if(failAt==='download')throw new Error('SECRET');return new Uint8Array([1,2,3]);},
    process:async bytes=>({bytes,width:600,height:600}),upload:async()=>{if(failAt==='upload')throw new Error('SECRET');},remove:async()=>{if(cleanupFails)throw new Error('SECRET');} };
  return{service:new EventCoverService(deps),calls,upload,deps};
}
test('commit after upload; cleanup failure preserves successful result',async()=>{const h=fixture({cleanupFails:true});assert.equal((await h.service.confirm(eventId,ownerId,uploadId,{})).committedRevision,'new');assert.deepEqual(h.calls.map(x=>x.action),['claim','commit']);assert.equal(h.calls[1].args.replaceAltText,false);});
test('explicit empty description differs from omission',async()=>{const h=fixture();await h.service.confirm(eventId,ownerId,uploadId,{altText:''});assert.equal(h.calls[1].args.replaceAltText,true);assert.equal(h.calls[1].args.altText,'');});
for(const failAt of ['download','upload'])test(`${failAt} failure preserves previous cover and releases claim`,async()=>{const h=fixture({failAt});await assert.rejects(()=>h.service.confirm(eventId,ownerId,uploadId,{}),e=>e.status===503&&!e.message.includes('SECRET'));assert.equal((await h.service.state(eventId,ownerId)).coverRevision,'old');assert.deepEqual(h.calls.map(x=>x.action),['claim','finish']);});
test('unknown commit does not release claim or promise rollback',async()=>{const h=fixture({failAt:'commit'});await assert.rejects(()=>h.service.confirm(eventId,ownerId,uploadId,{}),e=>e.status===503&&e.message.includes('confirmar'));assert.deepEqual(h.calls.map(x=>x.action),['claim','commit']);});
test('durable retry returns original revision and current state without processing',async()=>{const h=fixture({committed:true});const r=await h.service.confirm(eventId,ownerId,uploadId,{});assert.equal(r.committedRevision,'original');assert.equal(r.state.coverRevision,'old');assert.equal(h.calls.length,1);});
test('owner and reference are checked on every download',async()=>{const h=fixture();await assert.rejects(()=>h.service.state(eventId,'other'),e=>e.status===404);await assert.rejects(()=>h.service.image(eventId,'old'),e=>e.status===404);await assert.rejects(()=>h.service.image(eventId,'stale',ownerId),e=>e.status===404);});
test('operation projection excludes paths and claim credentials',async()=>{const h=fixture();const r=await h.service.operation(eventId,ownerId,uploadId);assert.deepEqual(Object.keys(r),['uploadId','status','committedRevision','state']);assert.ok(!JSON.stringify(r).includes('staging'));});
import { reconcileCoverChange } from '../lib/event-covers.ts';
test('description response loss: all recovery cases preserve original revision and image identity',()=>{
 const change={kind:'patch',baseRevision:'base',imageId:'image',altText:'texto'};
 assert.equal(reconcileCoverChange(change,{coverRevision:'next',cover:{imageId:'image',altText:' texto '}}),'matching');
 assert.equal(reconcileCoverChange(change,{coverRevision:'base',cover:{imageId:'image',altText:'old'}}),'retry');
 assert.equal(reconcileCoverChange(change,{coverRevision:'next',cover:{imageId:'other',altText:'texto'}}),'conflict');
 assert.equal(reconcileCoverChange(change,{coverRevision:'next',cover:null}),'conflict');
 assert.equal(change.baseRevision,'base');
});
test('deletion response loss: matching state never proves authorship',()=>{
 const change={kind:'delete',baseRevision:'base'};
 assert.equal(reconcileCoverChange(change,{coverRevision:'next',cover:null}),'matching');
 assert.equal(reconcileCoverChange(change,{coverRevision:'base',cover:{imageId:'image'}}),'retry');
 assert.equal(reconcileCoverChange(change,{coverRevision:'next',cover:{imageId:'other'}}),'conflict');
});
for(const [code,status] of [['CONFLICT',409],['BUSY',409],['EXPIRED',410],['REJECTED',422],['NOT_FOUND',404]])test(`coordination ${code} maps to ${status} before any image write`,async()=>{
 const h=fixture();h.deps.mutate=async()=>({code});h.deps.upload=async()=>assert.fail('Unexpected write');await assert.rejects(()=>h.service.confirm(eventId,ownerId,uploadId,{}),e=>e.status===status);
});
test('ownership transfer prevents any subsequent mutation',async()=>{const h=fixture();h.deps.event=async()=>({ownerId:'new-owner'});await assert.rejects(()=>h.service.confirm(eventId,ownerId,uploadId,{}),e=>e.status===404);assert.equal(h.calls.length,0);});
import { EventCoverError } from '../lib/event-covers.ts';
test('invalid bytes are rejected without mutating the cover',async()=>{
 const h=fixture();h.deps.process=async()=>{throw new EventCoverError(422,'Imagen inválida.');};await assert.rejects(()=>h.service.confirm(eventId,ownerId,uploadId,{}),e=>e.status===422);assert.equal(h.calls[1].args.status,'rejected');assert.equal((await h.service.state(eventId,ownerId)).coverRevision,'old');
});
test('expired pending operation remains a successful state query without path disclosure',async()=>{
 const h=fixture();h.upload.expiresAt='1969-01-01T00:00:00Z';assert.equal((await h.service.operation(eventId,ownerId,uploadId)).status,'expired');
});
test('public bytes use one metadata read and no download on stale reference',async()=>{
 const h=fixture();let metadata=0,downloads=0;h.deps.event=async()=>{metadata++;return{ownerId,published:true,state:{coverRevision:'rev',cover:{imageId:'current'}},objectPath:'canonical'};};h.deps.download=async()=>{downloads++;return new Uint8Array([1]);};
 await h.service.image(eventId,'current');assert.equal(metadata,1);assert.equal(downloads,1);
 await assert.rejects(()=>h.service.image(eventId,'old'),e=>e.status===404);assert.equal(downloads,1);
});
test('start returns only a scoped staging capability and leaves current cover intact',async()=>{
 const h=fixture();const result=await h.service.start(eventId,ownerId,{expectedRevision:'old',contentType:'image/png',byteLength:3});
 assert.equal(result.uploadBucket,'event-cover-staging');assert.equal(result.uploadPath,'staging');assert.ok(!JSON.stringify(result).includes('claim'));assert.equal((await h.service.state(eventId,ownerId)).coverRevision,'old');assert.equal(h.calls[0].args.expectedRevision,'old');
});
