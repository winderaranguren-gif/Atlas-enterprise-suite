export async function audit(env,event){
  const id=crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO audit_events(id,actor_user_id,organization_id,dba_id,action,resource_type,resource_id,decision,metadata_json)
    VALUES(?,?,?,?,?,?,?,?,?)
  `).bind(
    id,
    event.actorUserId||null,
    event.organizationId,
    event.dbaId,
    event.action,
    event.resourceType,
    event.resourceId||null,
    event.decision,
    JSON.stringify(event.metadata||{})
  ).run();
  return id;
}
