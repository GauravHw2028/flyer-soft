import {env} from 'cloudflare:workers';
import {workspaceOwnerId} from '../workspace-owner';
import {d1Database,isD1,postgresDatabase,type SqlDatabase} from '../server/database';
import {isR2,postgresObjects,r2Bucket,type ObjectStore} from '../server/objects';
import {storageFailure} from '../server/storage-failure';

/** Worker bindings locally; plain environment variables on Vercel. */
export function bindings(){return env as unknown as Record<string,unknown>;}
export async function owner(){return workspaceOwnerId();}
export function db():SqlDatabase{const binding=bindings().DB;if(isD1(binding))return d1Database(binding);return postgresDatabase();}
export function bucket():ObjectStore{const binding=bindings().BUCKET;if(isR2(binding))return r2Bucket(binding);return postgresObjects();}
/**
 * Vercel rejects function request bodies above 4.5 MB before the route runs, so
 * the enforced upload ceiling follows whichever backend is in use.
 */
export function maxUploadBytes(){const configured=Number(bindings().FLYERLY_MAX_UPLOAD_MB);if(Number.isFinite(configured)&&configured>0)return Math.round(configured*1024*1024);return isR2(bindings().BUCKET)?8*1024*1024:4*1024*1024;}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(req.headers.get('sec-fetch-site')==='cross-site'||(origin&&origin!==new URL(req.url).origin))throw new Response('Request origin rejected',{status:403});}
export function failure(e:unknown){if(e instanceof Response)return e;const advice=storageFailure(e);console.error('Flyerly storage error',advice.code,e);return Response.json({error:advice.error,code:advice.code,hint:advice.hint},{status:advice.status});}
