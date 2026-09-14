import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../chatgpt-auth';
export async function owner(){const user=await getChatGPTUser();if(!user)throw new Response('Please sign in to your workspace.',{status:401});return user.userId;}
export function db(){if(!env.DB)throw new Error('Storage is unavailable');return env.DB;}
export function bucket(){if(!env.BUCKET)throw new Error('Image storage is unavailable');return env.BUCKET;}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(req.headers.get('sec-fetch-site')==='cross-site'||(origin&&origin!==new URL(req.url).origin))throw new Response('Request origin rejected',{status:403});}
export function failure(e:unknown){if(e instanceof Response)return e;console.error('Flyerly storage error',e);return Response.json({error:'Could not reach your saved workspace. Please try again.'},{status:503});}
