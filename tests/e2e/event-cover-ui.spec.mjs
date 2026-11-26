import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
const fixture=fileURLToPath(new URL('../fixtures/event-covers/generated/valid.png',import.meta.url));
test.beforeEach(async({page,baseURL})=>{
  if(!baseURL?.includes(':3114'))test.skip(true,'Isolated cover preview server required on port 3114');
  await page.route('**/*',route=>{const url=new URL(route.request().url());if(!['127.0.0.1','localhost'].includes(url.hostname))return route.abort();return route.continue();});
  await page.route('**/api/organizador/eventos/*/portada/imagen/*',route=>route.fulfill({path:fixture,contentType:'image/png'}));
});
for(const width of [375,390,1280,1440])test(`stable 16:9 frames and full content at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:width===390?844:900});await page.goto('/');
  await expect(page.getByRole('heading',{name:'Pruebas aisladas de portadas'})).toBeVisible();
  for(const frame of await page.locator('[data-slot="event-cover"]').all()){
    const box=await frame.boundingBox();expect(Math.abs(box.height-box.width*9/16)).toBeLessThanOrEqual(1);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByLabel('Nombre del evento',{exact:true}).fill('Un encuentro con un título muy largo para compartir ideas y seguir construyendo conexiones con nuestra comunidad');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('image delay and failure cause zero layout shift',async({page})=>{
  let release;const waiting=new Promise(resolve=>{release=resolve;});
  await page.route('**/fixture-image?name=horizontal',async route=>{await waiting;await route.abort();});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const card=page.locator('[data-fixture="horizontal"]');
  const heading=card.getByRole('heading');const before=await heading.boundingBox();const cardBefore=await card.boundingBox();
  await page.waitForTimeout(5000);release();
  await expect(card.getByRole('img',{name:'No pudimos cargar la imagen',exact:true})).toBeVisible();
  const after=await heading.boundingBox();const cardAfter=await card.boundingBox();
  expect(after.y-before.y).toBe(0);expect(cardAfter.height-cardBefore.height).toBe(0);
  await expect(card.getByRole('link',{name:/Registrarme/})).toBeEnabled();
});
test('choose before create, explicit save and other fields survive',async({page})=>{
 await page.goto('/');const area=page.getByRole('region',{name:'Gestión de prueba'});
 await area.getByLabel('Imagen de portada',{exact:true}).setInputFiles(fixture);
 await expect(area.getByText('Vista previa sin guardar',{exact:true})).toBeVisible();
 await expect(area.getByRole('button',{name:'Guardar portada',exact:true})).toBeDisabled();
 await area.getByRole('button',{name:'Crear evento',exact:true}).click();
 await expect(area.getByText('Evento creado. Guarda ahora la portada.')).toBeVisible();
 await area.getByRole('button',{name:'Guardar portada',exact:true}).click();
 await expect(area.getByText('Portada guardada.',{exact:true})).toBeVisible();
 await expect(area.getByLabel('Otro dato del evento')).toHaveValue('Dato sin guardar');
});
test('saved description, remove and focus remain accessible',async({page})=>{
 await page.goto('/');await page.getByLabel('Escenario').selectOption('saved');
 const area=page.getByRole('region',{name:'Gestión de prueba'});
 await expect(area.getByRole('button',{name:'Quitar portada'})).toBeEnabled();
 await area.getByLabel('Descripción de la imagen (opcional)').fill('Descripción nueva');
 await area.getByRole('button',{name:'Guardar descripción'}).click();
 await expect(area.getByText('Descripción guardada.',{exact:true})).toBeVisible();
 await area.getByRole('button',{name:'Quitar portada'}).click();
 await expect(area.getByText('Portada eliminada.',{exact:true})).toBeVisible();
 await expect(area.getByLabel('Imagen de portada',{exact:true})).toBeFocused();
});
test('conflict preserves the file and unrelated fields',async({page})=>{
 await page.goto('/');await page.getByLabel('Escenario').selectOption('conflict');
 const area=page.getByRole('region',{name:'Gestión de prueba'});
 await area.getByLabel('Imagen de portada',{exact:true}).setInputFiles(fixture);
 await area.getByRole('button',{name:'Guardar portada',exact:true}).click();
 await expect(area.getByText('La portada cambió. Actualiza su estado antes de guardar.')).toBeVisible();
 await expect(area.getByText(/valid.png/)).toBeVisible();
 await expect(area.getByLabel('Otro dato del evento')).toHaveValue('Dato sin guardar');
});
test('keyboard, reduced motion and enlarged text retain all controls',async({page})=>{
 await page.setViewportSize({width:375,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await page.getByLabel('Escenario').selectOption('saved');
 await page.addStyleTag({content:'html { font-size: 200%; }'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const controls=page.getByRole('region',{name:'Gestión de prueba'}).locator('button,input,textarea');
 for(const control of await controls.all()){const box=await control.boundingBox();expect(box.height).toBeGreaterThanOrEqual(48);}
 await page.getByLabel('Imagen de portada',{exact:true}).focus();await page.keyboard.press('Tab');await expect(page.getByLabel('Descripción de la imagen (opcional)')).toBeFocused();
});
for(const kind of ['patch','delete'])for(const outcome of ['matching','retry','conflict','query-error'])test(`${kind} lost response reconciles ${outcome} without clearing the draft`,async({page})=>{
 await page.goto('/');await page.getByLabel('Escenario').selectOption('lost-'+outcome);
 const area=page.getByRole('region',{name:'Gestión de prueba'});
 await expect(area.getByRole('button',{name:'Quitar portada'})).toBeEnabled();
 await area.getByLabel('Descripción de la imagen (opcional)').fill('Cambio solicitado');
 await area.getByRole('button',{name:kind==='patch'?'Guardar descripción':'Quitar portada'}).click();
 if(outcome==='matching'){
  await expect(area.getByText(kind==='patch'?'La descripción actual coincide con el cambio solicitado.':'El evento está sin portada.',{exact:true})).toBeVisible();
  await expect(area.getByText(kind==='patch'?'Descripción guardada.':'Portada eliminada.',{exact:true})).toHaveCount(0);
 }else if(outcome==='retry'){
  await expect(area.getByText('No pudimos confirmar el cambio. Puedes volver a intentarlo.')).toBeVisible();
  await area.getByRole('button',{name:'Volver a intentar',exact:true}).click();
  await expect(area.getByText(kind==='patch'?'Descripción guardada.':'Portada eliminada.',{exact:true})).toBeVisible();return;
 }else if(outcome==='conflict')await expect(area.getByText('La portada cambió. Revisa el estado actual antes de guardar.')).toBeVisible();
 else await expect(area.getByText('No pudimos consultar la portada.')).toBeVisible();
 await expect(area.getByLabel('Descripción de la imagen (opcional)')).toHaveValue('Cambio solicitado');
 await expect(area.getByRole('button',{name:'Quitar portada'})).toBeDisabled();
 await expect(area.getByLabel('Otro dato del evento')).toHaveValue('Dato sin guardar');
});
test('matching description on another image remains a conflict',async({page})=>{
 await page.goto('/');await page.getByLabel('Escenario').selectOption('lost-other-image');
 const area=page.getByRole('region',{name:'Gestión de prueba'});await expect(area.getByRole('button',{name:'Quitar portada'})).toBeEnabled();
 await area.getByLabel('Descripción de la imagen (opcional)').fill('Mismo texto');await area.getByRole('button',{name:'Guardar descripción'}).click();
 await expect(area.getByText('La portada cambió. Revisa el estado actual antes de guardar.')).toBeVisible();
});
test('centered circles stay round and crop symmetrically in all source orientations',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/');
 const sharp=(await import('sharp')).default;
 for(const orientation of ['horizontal','vertical','square']){
  const frame=page.locator(`[data-fixture="${orientation}"] [data-slot="event-cover"]`);
  await expect.poll(()=>frame.locator('img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  const {data,info}=await sharp(await frame.screenshot()).removeAlpha().raw().toBuffer({resolveWithObject:true});
  let minX=info.width,minY=info.height,maxX=0,maxY=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const i=(y*info.width+x)*info.channels;if(Math.abs(data[i]-113)<3&&Math.abs(data[i+1]-145)<3&&Math.abs(data[i+2]-72)<3){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}}
  expect(Math.abs((maxX-minX)-(maxY-minY))).toBeLessThanOrEqual(2);
  expect(Math.abs((minX+maxX)/2-info.width/2)).toBeLessThanOrEqual(1);
  expect(Math.abs((minY+maxY)/2-info.height/2)).toBeLessThanOrEqual(1);
 }
});
test('public alternative follows current title while custom alternative stays intact',async({page})=>{
 await page.goto('/');const title='Un título actualizado';await page.getByLabel('Nombre del evento',{exact:true}).fill(title);
 await expect(page.getByRole('region',{name:'Registro de prueba'}).getByRole('img',{name:title,exact:true})).toBeVisible();
 await expect(page.locator('[data-fixture="horizontal"]').getByRole('img',{name:'Círculo centrado',exact:true})).toBeVisible();
 await expect(page.locator('[data-fixture="missing"]').getByRole('img',{name:'Sin imagen de portada',exact:true})).toBeVisible();
 await expect(page.locator('[data-fixture="missing"]').getByText('Sin imagen de portada',{exact:true})).toHaveCount(0);
});
test('cancelling a new file selection preserves the local draft',async({page})=>{
 await page.goto('/');const area=page.getByRole('region',{name:'Gestión de prueba'});const picker=area.getByLabel('Imagen de portada',{exact:true});await picker.setInputFiles(fixture);await picker.setInputFiles([]);await expect(area.getByText(/valid.png/)).toBeVisible();await expect(area.getByText('Vista previa sin guardar',{exact:true})).toBeVisible();
});
for(const scenario of ['session','load-error'])test(`${scenario} never enables mutations or clears other fields`,async({page})=>{
 await page.goto('/');await page.getByLabel('Escenario').selectOption(scenario);const area=page.getByRole('region',{name:'Gestión de prueba'});await expect(area.getByRole('alert')).toBeVisible();await area.getByLabel('Imagen de portada',{exact:true}).setInputFiles(fixture);await expect(area.getByRole('button',{name:'Guardar portada',exact:true})).toBeDisabled();await expect(area.getByRole('button',{name:'Quitar portada'})).toHaveCount(0);await expect(area.getByLabel('Otro dato del evento')).toHaveValue('Dato sin guardar');
});


test('duplicate registration guides recovery, preserves values and requires a corrected email before retry',async({page})=>{
 let requests=0;
 await page.route('**/api/registros',async route=>{requests++;await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'DUPLICATE'})});});
 await page.goto('/');
 const form=page.getByRole('region',{name:'Registro de prueba'});
 await form.getByRole('button',{name:'Confirmar mi registro',exact:true}).click();
 await expect(form.getByText('Elige un tipo de entrada',{exact:true})).toBeVisible();
 await expect(form.getByRole('radio').first()).toBeFocused();
 await form.getByRole('radio').first().check();
 await form.getByLabel('Tu nombre').fill('Ana Pérez');
 await form.getByLabel('Correo electrónico').fill('ana@example.com');
 await form.getByRole('button',{name:'Confirmar mi registro',exact:true}).click();
 await expect(form.getByRole('alert')).toContainText('Ya tienes un registro con este correo');
 await expect(form.getByRole('alert')).toContainText('pide a quien organiza el evento');
 await expect(form.getByLabel('Tu nombre')).toHaveValue('Ana Pérez');
 await expect(form.getByRole('radio').first()).toBeChecked();
 await expect(form.getByLabel('Correo electrónico')).toBeFocused();
 await expect(form.getByRole('button',{name:'Confirmar mi registro',exact:true})).toHaveCount(0);
 await form.getByRole('button',{name:'Corregir correo',exact:true}).click();
 await expect(form.getByLabel('Correo electrónico')).toBeFocused();
 expect(requests).toBe(1);
 await form.getByLabel('Correo electrónico').fill('otra@example.com');
 await expect(form.getByRole('alert')).toHaveCount(0);
 await expect(form.getByRole('button',{name:'Confirmar mi registro',exact:true})).toBeEnabled();
});

test('sold-out selection refreshes alternatives and focuses an enabled option after submission',async({page})=>{
 const eventId='d98afce0-d1e2-4fc9-a5ed-e50d547812da';
 const originalTicketId='d98afce0-d1e2-4fc9-a5ed-e50d547812db';
 const nextTicketId='d98afce0-d1e2-4fc9-a5ed-e50d547812dc';
 await page.route('**/api/registros',route=>route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'TICKET_UNAVAILABLE'})}));
 await page.route(`**/api/eventos/${eventId}`,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:eventId,title:'Encuentro para compartir nuevas ideas',description:'Una conversación abierta.',startsAt:'2026-12-10T20:00:00Z',venue:'Casa de encuentros',cover:null,coverRevision:null,ticketTypes:[{id:originalTicketId,name:'General',available:0},{id:nextTicketId,name:'Comunidad',available:8}]})}));
 await page.goto('/');const form=page.getByRole('region',{name:'Registro de prueba'});
 await form.getByRole('radio').first().check();
 await form.getByLabel('Tu nombre').fill('Ana Pérez');
 await form.getByLabel('Correo electrónico').fill('ana@example.com');
 await form.getByRole('button',{name:'Confirmar mi registro',exact:true}).click();
 await expect(form.getByRole('radio',{name:/General/})).toBeDisabled();
 await expect(form.getByRole('radio',{name:/Comunidad/})).toBeFocused();
 await expect(form.getByRole('radio',{name:/Comunidad/})).not.toBeChecked();
 await expect(form.getByLabel('Tu nombre')).toHaveValue('Ana Pérez');
 await expect(form.getByLabel('Correo electrónico')).toHaveValue('ana@example.com');
 await expect(form.getByRole('alert')).toContainText('Elige otra opción');
});

test('mobile detail links move keyboard focus to the content and back to registration',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 const area=page.getByRole('region',{name:'Registro de prueba'});
 await area.getByRole('link',{name:'Ver detalles del evento',exact:true}).click();
 await expect(area.locator('#detalles-del-evento')).toBeFocused();
 await area.getByRole('link',{name:'Volver al registro',exact:true}).click();
 await expect(area.locator('#registro')).toBeFocused();
 await page.keyboard.press('Tab');
 await expect(area.getByRole('radio').first()).toBeFocused();
});

for(const emailStatus of ['sent','failed'])test(`confirmation remains final when email delivery is ${emailStatus}`,async({page})=>{
 const ticketCode='a'.repeat(64);
 await page.route('**/api/registros',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ticketCode,emailStatus})}));
 await page.goto('/');const area=page.getByRole('region',{name:'Registro de prueba'});
 await area.getByRole('radio').first().check();
 await area.getByLabel('Tu nombre').fill('Ana Pérez');await area.getByLabel('Correo electrónico').fill('ana@example.com');
 await area.getByRole('button',{name:'Confirmar mi registro',exact:true}).click();
 await expect(area.getByRole('heading',{name:'Tu lugar está confirmado',exact:true})).toBeFocused();
 await expect(area.getByRole('link',{name:'Ver mi entrada y QR',exact:true})).toHaveAttribute('href',`/entradas/${ticketCode}`);
 await expect(area.getByRole('button',{name:'Confirmar mi registro',exact:true})).toHaveCount(0);
 if(emailStatus==='failed')await expect(area.getByRole('alert')).toContainText('No necesitas registrarte otra vez');
 else await expect(area.getByText(/Te enviamos un correo con tu entrada y el QR/)).toBeVisible();
});


test('private draft images use authenticated requests and missing covers remain visible',async({page})=>{
 let authorization;
 await page.route('**/api/organizador/eventos/*/portada/imagen/*',async route=>{
  authorization=route.request().headers().authorization;
  expect(route.request().url()).not.toContain('fixture-token');
  await route.fulfill({path:fixture,contentType:'image/png'});
 });
 await page.goto('/');
 const draft=page.locator('[data-fixture="organizer-draft"]');
 await expect(draft.getByRole('img',{name:'Portada privada del borrador',exact:true})).toBeVisible();
 expect(authorization).toBe('Bearer fixture-token');
 await expect(page.locator('[data-fixture="organizer-missing"]').getByText('Sin imagen de portada',{exact:true})).toBeVisible();
 const missing=page.locator('[data-fixture="missing"]');
 await expect(missing.getByRole('img',{name:'Sin imagen de portada',exact:true})).toBeVisible();
 await expect(missing.getByRole('link',{name:/Registrarme/})).toBeEnabled();
});

test('a private image failure preserves its frame and reports failure rather than absence',async({page})=>{
 await page.route('**/api/organizador/eventos/*/portada/imagen/*',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Servicio no disponible'})}));
 await page.goto('/');
 const draft=page.locator('[data-fixture="organizer-draft"]');
 await expect(draft.getByText('No pudimos cargar la imagen',{exact:true})).toBeVisible();
 await expect(draft.getByText('Sin imagen de portada',{exact:true})).toHaveCount(0);
 const box=await draft.locator('[data-slot="event-cover"]').boundingBox();
 expect(Math.abs(box.height-box.width*9/16)).toBeLessThanOrEqual(1);
});
