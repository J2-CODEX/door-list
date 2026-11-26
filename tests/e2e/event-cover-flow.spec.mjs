import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
// Import/listing is inert. Explicit authorization and a matching project are mandatory.
test.skip(process.env.RUN_E2E_DB_TESTS!=='1','Requires explicit database authorization');
let owner,ownerMirror,other,eventId,ticketTypeId,eventTitle;
const objects=[];
const createdEvents=[];
const required=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','E2E_TEST_PROJECT_REF','E2E_ORGANIZER_EMAIL','E2E_ORGANIZER_PASSWORD','E2E_OTHER_ORGANIZER_EMAIL','E2E_OTHER_ORGANIZER_PASSWORD'];
let admin;
test.beforeAll(async()=>{
 const serverKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 const missing=required.filter(name=>!process.env[name]);if(!serverKey)missing.push('SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)');if(missing.length)throw new Error('Missing integration environment: '+missing.join(', '));
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 if(new URL(url).hostname.split('.')[0]!==process.env.E2E_TEST_PROJECT_REF)throw new Error('Explicit test project does not match configured Supabase URL');
 const login=async(email,password)=>{const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const{data,error}=await client.auth.signInWithPassword({email,password});if(error||!data.session)throw new Error('Test organizer authentication failed');return{client,token:data.session.access_token,userId:data.user.id};};
 owner=await login(process.env.E2E_ORGANIZER_EMAIL,process.env.E2E_ORGANIZER_PASSWORD);
 ownerMirror=await login(process.env.E2E_ORGANIZER_EMAIL,process.env.E2E_ORGANIZER_PASSWORD);
 other=await login(process.env.E2E_OTHER_ORGANIZER_EMAIL,process.env.E2E_OTHER_ORGANIZER_PASSWORD);
 admin=createClient(url,serverKey,{auth:{persistSession:false,autoRefreshToken:false}});
 eventTitle='Cover integration '+randomUUID();
 const{data,error}=await owner.client.from('events').insert({owner_id:owner.userId,title:eventTitle,description:'Disposable integration fixture',starts_at:new Date(Date.now()+7*86400000).toISOString(),venue:'Test',status:'published',capacity:10}).select('id').single();if(error)throw new Error('Test event creation failed');eventId=data.id;
 const type=await owner.client.from('ticket_types').insert({event_id:eventId,name:'General',capacity:10}).select('id').single();if(type.error)throw new Error('Test ticket type creation failed');ticketTypeId=type.data.id;
});
test.afterAll(async()=>{
 if(!admin||!eventId)return;
 // Only this test's event and paths are eligible for removal; never sweep a bucket.
 for(const object of objects)await admin.storage.from(object.bucket).remove([object.path]);
 const cover=await admin.from('event_covers').select('object_path').eq('event_id',eventId).maybeSingle();if(cover.data?.object_path)await admin.storage.from('event-covers').remove([cover.data.object_path]);
 const registrations=await admin.from('registrations').select('id').eq('event_id',eventId);
 if(registrations.data?.length){await admin.from('tickets').delete().in('registration_id',registrations.data.map(row=>row.id));await admin.from('registrations').delete().eq('event_id',eventId);}
 for(const id of [eventId,...createdEvents]){
  const row=await admin.from('event_covers').select('object_path').eq('event_id',id).maybeSingle();if(row.data?.object_path)await admin.storage.from('event-covers').remove([row.data.object_path]);
  await owner.client.from('events').delete().eq('id',id).eq('owner_id',owner.userId);
 }
});
test('persistent upload, revision race, description, visibility, replacement and deletion',async({request,page})=>{
 const base=`/api/organizador/eventos/${eventId}/portada`;
 const headers={Authorization:`Bearer ${owner.token}`};
 const mutate=(path,method,data)=>request.fetch(path,{method,headers,data});
 const registered=await owner.client.rpc('register_attendee',{p_event_id:eventId,p_ticket_type_id:ticketTypeId,p_name:'Integration fixture',p_email:`cover-${randomUUID()}@test.invalid`});expect(registered.error).toBeNull();expect(registered.data.code).toBe('SUCCESS');
 const ticketCode=registered.data.ticketCode;
 const initial=await request.get(`/api/eventos/${eventId}`);expect(initial.ok()).toBeTruthy();const initialData=await initial.json();expect(initialData.cover).toBeNull();
 const upload=async(expectedRevision,name='valid.png',altText='Círculo de prueba')=>{
  const bytes=await readFile(new URL(`../fixtures/event-covers/generated/${name}`,import.meta.url));const contentType=name.endsWith('jpg')?'image/jpeg':name.endsWith('webp')?'image/webp':'image/png';
  const started=await mutate(base+'/subidas','POST',{expectedRevision,contentType,byteLength:bytes.length});expect(started.status()).toBe(201);const permission=await started.json();objects.push({bucket:permission.uploadBucket,path:permission.uploadPath});
  const result=await owner.client.storage.from(permission.uploadBucket).uploadToSignedUrl(permission.uploadPath,permission.uploadToken,bytes,{contentType});expect(result.error).toBeNull();
  const finished=await mutate(base+`/subidas/${permission.uploadId}/confirmar`,'POST',altText===undefined?{}:{altText});expect(finished.status()).toBe(200);const saved=await finished.json();objects.push({bucket:'event-covers',path:`${eventId}/${saved.state.cover.imageId}.webp`});return{...saved,uploadId:permission.uploadId};
 };
 const first=await upload(null);const firstImage=first.state.cover.imageId;
 const url=`/api/eventos/${eventId}/portada/${firstImage}`;
 const bytes=await request.get(url);expect(bytes.status()).toBe(200);expect(bytes.headers()['content-type']).toContain('image/webp');
 const retry=await mutate(base+`/subidas/${first.uploadId}/confirmar`,'POST',{});expect((await retry.json()).committedRevision).toBe(first.committedRevision);
 expect((await request.get(base,{headers:{Authorization:`Bearer ${other.token}`}})).status()).toBe(404);
 const direct=await owner.client.from('event_covers').update({alt_text:'Bypass'}).eq('event_id',eventId);expect(direct.error).not.toBeNull();
 const changed=await mutate(base,'PATCH',{expectedRevision:first.state.coverRevision,altText:'Alternativa vigente'});expect(changed.status()).toBe(200);const edited=await changed.json();expect(edited.cover.imageId).toBe(firstImage);
 const stale=await mutate(base,'DELETE',{expectedRevision:first.state.coverRevision});expect(stale.status()).toBe(409);
 const directPath=`${eventId}/${randomUUID()}.webp`;objects.push({bucket:'event-covers',path:directPath});
 const bypass=await owner.client.storage.from('event-covers').upload(directPath,new Uint8Array([1]),{contentType:'image/webp'});expect(bypass.error).not.toBeNull();
 const second=await upload(edited.coverRevision,'valid.webp','Alternativa vigente');expect(second.state.cover.imageId).not.toBe(firstImage);expect((await request.get(url)).status()).toBe(404);
 await page.goto('/');await page.getByRole('article').filter({has:page.getByRole('heading',{name:eventTitle,exact:true})}).getByRole('link',{name:/Registrarme/}).click();await expect(page.getByAltText('Alternativa vigente')).toBeVisible();
 await owner.client.from('events').update({status:'draft'}).eq('id',eventId);expect((await request.get(`/api/eventos/${eventId}/portada/${second.state.cover.imageId}`)).status()).toBe(404);
 await owner.client.from('events').update({status:'published'}).eq('id',eventId);
 const removed=await mutate(base,'DELETE',{expectedRevision:second.state.coverRevision});expect(removed.status()).toBe(200);expect((await removed.json()).cover).toBeNull();
 const finalEvent=await request.get(`/api/eventos/${eventId}`);const finalData=await finalEvent.json();expect(finalData.ticketTypes.find(t=>t.id===ticketTypeId).available).toBe(initialData.ticketTypes.find(t=>t.id===ticketTypeId).available);
 const admission=await request.post('/api/organizador/check-in',{headers,data:{eventId,ticketCode}});expect(admission.status()).toBe(200);
 expect((await request.post('/api/organizador/check-in',{headers,data:{eventId,ticketCode}})).status()).toBe(409);
 const operation=await request.get(base+`/subidas/${first.uploadId}`,{headers});const finalOperation=await operation.json();expect(finalOperation.committedRevision).toBe(first.committedRevision);expect(finalOperation.state.cover).toBeNull();
});

test('select before creating, create once, save cover explicitly and reopen',async({page})=>{
 const title='Cover editor integration '+randomUUID();
 let creations=0;
 page.on('response',async response=>{
  if(response.request().method()==='POST'&&new URL(response.url()).pathname==='/rest/v1/events'&&response.ok()){
   const rows=await response.json().catch(()=>null);
   for(const row of Array.isArray(rows)?rows:rows?[rows]:[])if(row.id){createdEvents.push(row.id);creations++;}
  }
 });
 await page.goto('/organizador');await page.getByLabel('Correo',{exact:true}).fill(process.env.E2E_ORGANIZER_EMAIL);await page.getByLabel('Contraseña',{exact:true}).fill(process.env.E2E_ORGANIZER_PASSWORD);await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('button',{name:'Crear evento',exact:true}).click();
 const panel=page.getByRole('dialog');
 await panel.getByLabel('Nombre del evento').fill(title);await panel.getByLabel('Descripción',{exact:true}).fill('Disposable editor fixture');await panel.getByLabel('Lugar',{exact:true}).fill('Test');await panel.getByLabel('Fecha y hora').fill(new Date(Date.now()+7*86400000).toISOString().slice(0,16));await panel.getByLabel('Límite de asistentes').fill('10');
 await panel.getByLabel('Imagen de portada',{exact:true}).setInputFiles(new URL('../fixtures/event-covers/generated/valid.jpg',import.meta.url).pathname);
 await panel.getByRole('button',{name:'Crear evento',exact:true}).click();await expect(panel.getByText('Evento creado. Guarda ahora la portada.')).toBeVisible();expect(creations).toBe(1);
 await panel.getByRole('button',{name:'Guardar portada',exact:true}).click();await expect(panel.getByText('Portada guardada.',{exact:true})).toBeVisible();expect(creations).toBe(1);
 await panel.getByRole('button',{name:'Cancelar',exact:true}).click();
 const article=page.getByRole('article').filter({has:page.getByRole('heading',{name:title,exact:true})});await article.getByRole('button',{name:'Editar evento',exact:true}).click();await expect(page.getByRole('dialog').getByRole('button',{name:'Quitar portada',exact:true})).toBeEnabled();
});
test('invalid originals preserve persisted cover and exact byte limit is inclusive',async({request})=>{
 const base=`/api/organizador/eventos/${eventId}/portada`,headers={Authorization:`Bearer ${owner.token}`};
 const state=await request.get(base,{headers});expect(state.status()).toBe(200);const previous=await state.json();
 for(const name of ['corrupt.png','animated.png','animated.webp','width-599.png','height-6001.png']){
  const bytes=await readFile(new URL(`../fixtures/event-covers/generated/${name}`,import.meta.url));const contentType=name.endsWith('webp')?'image/webp':'image/png';
  const start=await request.post(base+'/subidas',{headers,data:{expectedRevision:previous.coverRevision,contentType,byteLength:bytes.length}});expect(start.status()).toBe(201);const permission=await start.json();objects.push({bucket:permission.uploadBucket,path:permission.uploadPath});
  const upload=await owner.client.storage.from(permission.uploadBucket).uploadToSignedUrl(permission.uploadPath,permission.uploadToken,bytes,{contentType});expect(upload.error).toBeNull();
  expect((await request.post(base+`/subidas/${permission.uploadId}/confirmar`,{headers,data:{}})).status()).toBe(422);
  expect(await(await request.get(base,{headers})).json()).toEqual(previous);
 }
 expect((await request.post(base+'/subidas',{headers,data:{expectedRevision:previous.coverRevision,contentType:'image/png',byteLength:5242881}})).status()).toBe(413);
 const bytes=await readFile(new URL('../fixtures/event-covers/generated/bytes-5242880.png',import.meta.url));
 const started=await request.post(base+'/subidas',{headers,data:{expectedRevision:previous.coverRevision,contentType:'image/png',byteLength:bytes.length}});expect(started.status()).toBe(201);const permission=await started.json();objects.push({bucket:permission.uploadBucket,path:permission.uploadPath});
 expect((await owner.client.storage.from(permission.uploadBucket).uploadToSignedUrl(permission.uploadPath,permission.uploadToken,bytes,{contentType:'image/png'})).error).toBeNull();
 const finished=await request.post(base+`/subidas/${permission.uploadId}/confirmar`,{headers,data:{}});expect(finished.status()).toBe(200);const saved=await finished.json();objects.push({bucket:'event-covers',path:`${eventId}/${saved.state.cover.imageId}.webp`});
});

test('two owner sessions with the same revision allow exactly one update',async({request})=>{
 const base=`/api/organizador/eventos/${eventId}/portada`;
 const current=await request.get(base,{headers:{Authorization:`Bearer ${owner.token}`}});expect(current.status()).toBe(200);const previous=await current.json();
 const responses=await Promise.all([owner,ownerMirror].map((session,index)=>request.patch(base,{headers:{Authorization:`Bearer ${session.token}`},data:{expectedRevision:previous.coverRevision,altText:'Concurrent '+index}})));
 expect(responses.map(response=>response.status()).sort()).toEqual([200,409]);
 const final=await request.get(base,{headers:{Authorization:`Bearer ${owner.token}`}});const state=await final.json();expect(state.cover.imageId).toBe(previous.cover.imageId);expect(state.coverRevision).not.toBe(previous.coverRevision);
});
