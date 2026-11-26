import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanupEventCovers } from '../scripts/cleanup-event-covers.mjs';
const now=Date.parse('2026-11-26T12:00:00Z');
test('recursive sweep skips young, referenced and active objects and is repeatable',async()=>{
 const removed=[];const eligible=[];const objects=[{name:'old',createdAt:new Date(now-4*3600000).toISOString()},{name:'young',createdAt:new Date(now-2*3600000).toISOString()},{name:'current',createdAt:new Date(now-5*3600000).toISOString()},{name:'active',createdAt:new Date(now-5*3600000).toISOString()},{name:'deleted-event',createdAt:new Date(now-5*3600000).toISOString()}];
 const deps={now:()=>now,list:async(bucket,prefix,offset)=>offset?[]:prefix?objects.filter(x=>!removed.includes(bucket+'/folder/'+x.name)):[{name:'folder',isDirectory:true}],canDelete:async(bucket,path)=>{eligible.push(path);return !['current','active'].some(x=>path.endsWith('/'+x));},remove:async(bucket,path)=>removed.push(bucket+'/'+path),purge:async()=>0};
 assert.equal((await cleanupEventCovers(deps)).removed,4);assert.ok(!eligible.some(x=>x.endsWith('/young')));assert.equal((await cleanupEventCovers(deps)).removed,0);
});
test('unknown creation times are never deleted; failures do not purge results',async()=>{let purged=false;await assert.rejects(()=>cleanupEventCovers({now:()=>now,list:async()=>{throw new Error('unavailable');},purge:async()=>{purged=true;}}));assert.equal(purged,false);});
test('dry run cannot remove or purge',async()=>{const result=await cleanupEventCovers({now:()=>now,list:async(_b,_p,o)=>o?[]:[{name:'orphan',createdAt:new Date(now-4*3600000).toISOString()}],canDelete:async()=>true,remove:async()=>assert.fail(),purge:async()=>assert.fail()},{dryRun:true});assert.equal(result.removed,0);assert.equal(result.candidates,2);});
test('deletion failure preserves terminal records for a later sweep',async()=>{
 let purged=false;await assert.rejects(()=>cleanupEventCovers({now:()=>now,list:async()=>[{name:'old',createdAt:new Date(now-4*3600000).toISOString()}],canDelete:async()=>true,remove:async()=>{throw new Error('storage unavailable');},purge:async()=>{purged=true;}}));assert.equal(purged,false);
});
