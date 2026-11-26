import { neon } from "@neondatabase/serverless"
const sql = neon(process.env.DATABASE_URL)
const rows = await sql`SELECT id, name, graph FROM workflows WHERE id IN ('72b966f9-fada-4992-adcb-1231e3d42223', '86c860b5-8f27-433d-a004-421f1ed69ed6')`
rows.forEach(r => {
  console.log("=== " + r.name + " (" + r.id + ")")
  const g = r.graph
  console.log("nodes:", JSON.stringify(g?.nodes?.map(n => ({ id: n.id, type: n.data?.type, kind: n.data?.kind, title: n.data?.title }))))
  console.log("edges:", JSON.stringify(g?.edges?.map(e => e.source + "->" + e.target)))
})
