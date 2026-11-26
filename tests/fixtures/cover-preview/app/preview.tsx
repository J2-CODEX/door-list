"use client";
import { useMemo, useState } from 'react';
import { OrganizerEventCover } from '@/components/organizer-event-cover';
import { PublicEventCard } from '@/app/public-event-card';
import RegistrationForm from '@/app/eventos/[eventId]/registro/registration-form';
import { RegistrationEventDetails } from '@/app/eventos/[eventId]/registro/event-details';
import EventCoverEditor, { type CoverEditorTransport } from '@/app/organizador/event-cover-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { EventCoverState } from '@/lib/event-covers';
const eventId='d98afce0-d1e2-4fc9-a5ed-e50d547812da';
const imageId='d98afce0-d1e2-4fc9-a5ed-e50d547812db';
const revision='d98afce0-d1e2-4fc9-a5ed-e50d547812dc';
const nextRevision='d98afce0-d1e2-4fc9-a5ed-e50d547812dd';
export default function Preview() {
 const [title,setTitle]=useState('Encuentro para compartir nuevas ideas');
 const [editingId,setEditingId]=useState<string|null>(null);
 const [pending,setPending]=useState(false);
 const [scenario,setScenario]=useState('default');
 const [version,setVersion]=useState(0);
 const transport=useMemo(()=>createFixtureTransport(scenario),[scenario]);
 const event={id:eventId,title,description:'Una conversación abierta con personas de nuestra comunidad.',venue:'Casa de encuentros',starts_at:'2026-12-10T20:00:00Z',coverRevision:revision,ticketTypes:[{id:imageId,name:'General',available:10}]};
 return <main className="mx-auto max-w-6xl space-y-12 px-6 py-8 sm:px-10">
   <h1 className="text-4xl font-semibold wrap-anywhere">Pruebas aisladas de portadas</h1>
   <label htmlFor="preview-title">Nombre del evento</label><Input id="preview-title" value={title} onChange={e=>setTitle(e.target.value)}/>
   <section aria-label="Cartelera de prueba" className="grid gap-6 md:grid-cols-2">{['horizontal','vertical','square','white','black','missing'].map(name=><div key={name} data-fixture={name} className="min-w-0"><PublicEventCard event={{...event,cover:name==='missing'?null:{imageId:name,altText:'Círculo centrado',width:1600,height:900,contentType:'image/webp',imageUrl:`/fixture-image?name=${name}`}}}/></div>)}</section>
   <section aria-label="Portadas del organizador" className="grid gap-6 md:grid-cols-2">
     <div data-fixture="organizer-draft"><OrganizerEventCover eventId={eventId} token="fixture-token" title={title} cover={{imageId,altText:'Portada privada del borrador',width:1600,height:900,contentType:'image/webp',imageUrl:null}} /></div>
     <div data-fixture="organizer-missing"><OrganizerEventCover eventId={eventId} token="fixture-token" title={title} cover={null} /></div>
   </section>
   <section aria-label="Registro de prueba"><RegistrationEventDetails event={{...event,cover:{imageId,altText:null,width:900,height:1600,contentType:'image/webp',imageUrl:'/fixture-image?name=vertical'}}}><RegistrationForm initialEvent={{...event,cover:null}} /></RegistrationEventDetails></section>
   <section aria-label="Gestión de prueba" className="max-w-xl space-y-6">
     <label htmlFor="scenario">Escenario</label><select id="scenario" value={scenario} onChange={e=>{setScenario(e.target.value);setVersion(v=>v+1);setEditingId(eventId);}}>{['default','saved','session','load-error','conflict','lost-matching','lost-retry','lost-conflict','lost-query-error','lost-other-image'].map(s=><option key={s}>{s}</option>)}</select>
     <Input aria-label="Otro dato del evento" defaultValue="Dato sin guardar" />
     <EventCoverEditor key={version} eventId={editingId} title={title} token="fixture-token" transport={transport} onPendingChange={setPending}/>
     <Button type="button" onClick={()=>setEditingId(eventId)}>{editingId?'Guardar datos del evento':'Crear evento'}</Button>
     {editingId&&pending&&<p role="status">Evento creado. Guarda ahora la portada.</p>}
   </section>
 </main>;
}

function createFixtureTransport(scenario: string): CoverEditorTransport {

   let lost = false;
   let state:EventCoverState=(scenario==='saved'||scenario.startsWith('lost-'))?{coverRevision:revision,cover:{imageId,altText:'Círculo centrado',width:1600,height:900,contentType:'image/webp',imageUrl:null}}:{coverRevision:null,cover:null};
   return {transfer:async()=>{},request:async(input,init)=>{
     const url=String(input),method=init?.method??'GET';
     if(url.includes('/imagen/'))return fetch('/fixture-image?name=horizontal');
     if(lost && scenario==='lost-query-error' && method==='GET')return Response.json({error:'No pudimos consultar la portada.'},{status:503});
     if(scenario==='session')return Response.json({error:'Inicia sesión para guardar la portada.'},{status:401});
     if(scenario==='load-error'&&method==='GET')return Response.json({error:'No pudimos consultar la portada.'},{status:503});
     if(scenario==='conflict'&&method!=='GET')return Response.json({error:'La portada cambió. Actualiza su estado antes de guardar.'},{status:409});
     if(url.endsWith('/subidas'))return Response.json({uploadId:imageId,uploadPath:'fixture',uploadToken:'fake',uploadBucket:'event-cover-staging',uploadExpiresAt:'2027-01-01',expiresAt:'2027-01-01'},{status:201});
     if(url.endsWith('/confirmar')){state={coverRevision:nextRevision,cover:{imageId,altText:JSON.parse(String(init?.body)).altText||null,width:900,height:600,contentType:'image/webp',imageUrl:null}};return Response.json({uploadId:imageId,committedRevision:nextRevision,state});}
     const drop = scenario.startsWith('lost-') && method !== 'GET' && !lost;
     if(drop && scenario==='lost-retry') { lost=true; throw new Error('Response lost'); }
     if(drop && scenario==='lost-conflict') { lost=true; state={...state,coverRevision:nextRevision}; throw new Error('Response lost'); }
     if(method==='PATCH'){const body=JSON.parse(String(init?.body));state={...state,coverRevision:nextRevision,cover:state.cover?{...state.cover,altText:body.altText.trim()||null}:null};}
     if(method==='DELETE')state={coverRevision:nextRevision,cover:null};
     if(drop){lost=true;if(scenario==='lost-other-image'&&state.cover)state={...state,cover:{...state.cover,imageId:nextRevision}};throw new Error('Response lost');}
     return Response.json(state);
   }};

}
