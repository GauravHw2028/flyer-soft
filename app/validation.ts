import {z} from 'zod';
const image=z.string().max(250).refine(v=>v===''||/^\/products\/[a-z]+\.jpg$/.test(v)||/^\/api\/assets\/[0-9a-f-]{36}$/.test(v),'Invalid image reference');
export const brandSchema=z.object({name:z.string().min(1).max(60),address:z.string().max(140),phone:z.string().max(40),currency:z.string().min(1).max(8),color:z.string().regex(/^#[0-9a-f]{6}$/i),logo:image,terms:z.string().max(220)});
export const productSchema=z.object({id:z.string().min(1).max(80),name:z.string().min(1).max(100),pack:z.string().max(50),category:z.string().max(40),price:z.number().finite().min(0).max(999999),image,sku:z.string().max(80)});
const templateSchema=z.object({id:z.string().min(1).max(80),name:z.string().min(1).max(50),color:z.string().regex(/^#[0-9a-f]{6}$/i),accent:z.string().regex(/^#[0-9a-f]{6}$/i),columns:z.number().int().min(2).max(3),capacity:z.number().int().min(4).max(12),style:z.string().max(20),artwork:z.enum(["/templates/artisan-higgsfield.png"]).optional()});
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>!isNaN(Date.parse(s)));
export const campaignSchema=z.object({id:z.string().min(1).max(80),name:z.string().min(1).max(80),headline:z.string().max(90),start:date,end:date,template:z.string().max(80),templateSnapshot:templateSchema.optional(),items:z.array(productSchema.extend({offer:z.number().finite().min(0).max(999999),badge:z.string().max(30)})).max(120),brand:brandSchema,updated:z.string().max(40),status:z.enum(['draft','ready'])});
export const workspaceSchema=z.object({products:z.array(productSchema).max(1500),campaigns:z.array(campaignSchema).max(150),brand:brandSchema,customTemplates:z.array(templateSchema).max(100)}).superRefine((v,c)=>{for(const [k,a] of Object.entries({products:v.products,campaigns:v.campaigns,customTemplates:v.customTemplates})){if(new Set(a.map(x=>x.id)).size!==a.length)c.addIssue({code:'custom',message:'Duplicate '+k+' IDs'});}});


