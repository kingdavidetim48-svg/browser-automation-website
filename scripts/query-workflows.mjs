import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const rows = await sql.query("SELECT id, name, organization_id, graph FROM workflows");
console.log(JSON.stringify(rows.map(r => ({ id: r.id, name: r.name, org_id: r.organization_id, nodeCount: r.graph?.nodes?.length, nodes: r.graph?.nodes?.map(n => n.data?.title) })), null, 2));
