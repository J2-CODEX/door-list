import { fileURLToPath } from 'node:url';
const buckets=['event-cover-staging','event-covers'];
/** All IO is injected. Importing this module never creates a client or connects. */
export async function cleanupEventCovers(deps,{dryRun=false}={}) {
  const result={candidates:0,removed:0,purged:0};
  for(const bucket of buckets) {
    const folders=[''];
    while(folders.length) {
      const prefix=folders.pop(); const objects=[];
      // Collect before deleting; deleting while offset-paginating skips objects.
      for(let offset=0;;offset+=1000) {
        const page=await deps.list(bucket,prefix,offset);
        objects.push(...page);
        if(page.length<1000)break;
      }
      for(const object of objects) {
        const path=[prefix,object.name].filter(Boolean).join('/');
        if(object.isDirectory){folders.push(path);continue;}
        const age=deps.now()-Date.parse(object.createdAt ?? '');
        if(!Number.isFinite(age)||age<=3*60*60*1000)continue;
        if(!await deps.canDelete(bucket,path))continue;
        result.candidates++;
        if(!dryRun){await deps.remove(bucket,path);result.removed++;}
      }
    }
  }
  if(!dryRun)result.purged=await deps.purge();
  return result;
}
async function main() {
  if(process.env.CONFIRM_EVENT_COVER_CLEANUP!=='1')throw new Error('Autoriza primero el entorno y alcance de la limpieza; después configura CONFIRM_EVENT_COVER_CLEANUP=1.');
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('Falta la configuración del servidor.');
  const {createClient}=await import('@supabase/supabase-js');
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const deps={
    now:()=>Date.now(),
    async list(bucket,prefix,offset){const {data,error}=await client.storage.from(bucket).list(prefix,{limit:1000,offset,sortBy:{column:'name',order:'asc'}});if(error)throw new Error('No pudimos listar imágenes.');return data.map(row=>({name:row.name,isDirectory:row.id===null,createdAt:row.created_at}));},
    async canDelete(bucket,path){const {data,error}=await client.rpc('is_event_cover_cleanup_candidate',{p_bucket_id:bucket,p_object_path:path});if(error)throw new Error('No pudimos comprobar las referencias.');return data===true;},
    async remove(bucket,path){const {error}=await client.storage.from(bucket).remove([path]);if(error)throw new Error('No pudimos eliminar una imagen huérfana.');},
    async purge(){
      const events=new Set();
      for(let offset=0;;offset+=1000){const {data,error}=await client.from('event_cover_uploads').select('event_id').in('status',['committed','rejected','expired']).lt('finished_at',new Date(Date.now()-24*3600000).toISOString()).order('id').range(offset,offset+999);if(error)throw new Error('No pudimos consultar operaciones terminales.');for(const row of data)events.add(row.event_id);if(data.length<1000)break;}
      let count=0;for(const id of events){const {data,error}=await client.rpc('purge_event_cover_uploads',{p_event_id:id});if(error)throw new Error('No pudimos purgar operaciones terminales.');count+=data;}
      return count;
    },
  };
  console.log(JSON.stringify(await cleanupEventCovers(deps,{dryRun:process.argv.includes('--dry-run')})));
}
if(process.argv[1]===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
