const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth);
const MANAGERS = new Set(['admin', 'production_chief', 'workshop_head']);
const canManage = req => MANAGERS.has(req.user?.role);
const actorId = req => { const n = Number(req.user?.sub); return Number.isSafeInteger(n) && n > 0 ? n : null; };
const positive = (v, label, allowZero = false) => { const n = Number(v); if (!Number.isFinite(n) || (allowZero ? n < 0 : n <= 0)) throw new Error(`Invalid ${label}.`); return n; };
const text = (v, label, max, optional = false) => { if (optional && (v === undefined || v === null || v === '')) return null; if (typeof v !== 'string' || !v.trim() || v.trim().length > max) throw new Error(`Invalid ${label}.`); return v.trim(); };
const fail = (res, e, message) => { const detail = String(e.message || ''); const bad = detail.startsWith('Invalid ') || detail.includes('does not exist') || detail.includes('must be'); if (e?.code === 'ER_DUP_ENTRY') { console.error(message, e.message); return res.status(409).json({success:false,message:'A record with that unique value already exists.'}); } console.error(message, e.message); return res.status(bad ? 400 : 500).json({success:false,message:bad ? e.message : message}); };
async function audit(conn, req, action, entity, id, details = {}) {
  const auditAction = action === 'CREATE' ? 'INSERT' : action === 'DELETE' ? 'DELETE' : 'UPDATE';
  await conn.execute('INSERT INTO audit_trail (table_name, record_id, action, actor_id, old_data, new_data) VALUES (?, ?, ?, ?, NULL, ?)', [entity, id == null ? null : String(id), auditAction, actorId(req), JSON.stringify({ event: action, role: req.user?.role || null, ip: req.ip || null, ...details })]);
}

// Spare-parts catalogue and immutable stock movement history.
router.get('/spare-parts', async (req,res) => { try { const [rows] = await pool.execute('SELECT id,sku,name,category,location,stock_quantity AS stock,minimum_quantity AS minimum_stock,unit_cost,created_by_user_id AS created_by,created_at,updated_at FROM warehouse_parts ORDER BY name, id'); return res.json({success:true,data:rows}); } catch(e) { return fail(res,e,'Could not retrieve spare parts. Apply the phase migration first.'); } });
router.post('/spare-parts', async (req,res) => {
 if (!canManage(req)) return res.status(403).json({success:false,message:'Permission denied.'});
 let c; try { const b=req.body||{}, name=text(b.name,'part name',200), stock=positive(b.stock??0,'stock',true), minimum=positive(b.minimumStock??b.minimum_stock??0,'minimum stock',true), cost=positive(b.unitCost??b.unit_cost??0,'unit cost',true); c=await pool.getConnection(); await c.beginTransaction(); const [r]=await c.execute('INSERT INTO warehouse_parts (sku,name,category,location,stock_quantity,minimum_quantity,unit_cost,created_by_user_id) VALUES (?,?,?,?,?,?,?,?)',[text(b.sku,'SKU',100,true),name,text(b.category,'category',120,true),text(b.location,'location',160,true),stock,minimum,cost,actorId(req)]); if(stock>0) await c.execute("INSERT INTO warehouse_movements (part_id,movement_type,quantity,reason,created_by_user_id) VALUES (?,'adjust',?,'Opening balance',?)",[r.insertId,stock,actorId(req)]); await audit(c,req,'CREATE','spare_part',r.insertId,{name}); await c.commit(); return res.status(201).json({success:true,data:{id:r.insertId}}); } catch(e) { if(c) await c.rollback().catch(()=>{}); return fail(res,e,'Could not create spare part.'); } finally { if(c)c.release(); }
});

router.put('/spare-parts/:id', async (req,res) => {
 if (!canManage(req)) return res.status(403).json({success:false,message:'Permission denied.'});
 const id=positive(req.params.id,'part ID'); let c;
 try {
  const b=req.body||{}; c=await pool.getConnection(); await c.beginTransaction();
  const [rows]=await c.execute('SELECT * FROM warehouse_parts WHERE id=? FOR UPDATE',[id]);
  if(!rows.length){await c.rollback();return res.status(404).json({success:false,message:'Spare part not found.'});}
  const old=rows[0],name=b.name===undefined?old.name:text(b.name,'part name',200),sku=b.sku===undefined?old.sku:text(b.sku,'SKU',100,true),category=b.category===undefined?old.category:text(b.category,'category',120,true),location=b.location===undefined?old.location:text(b.location,'location',160,true),minimum=b.minimumStock===undefined&&b.minimum_stock===undefined?Number(old.minimum_quantity):positive(b.minimumStock??b.minimum_stock,'minimum stock',true),cost=b.unitCost===undefined&&b.unit_cost===undefined?Number(old.unit_cost):positive(b.unitCost??b.unit_cost,'unit cost',true);
  await c.execute('UPDATE warehouse_parts SET sku=?,name=?,category=?,location=?,minimum_quantity=?,unit_cost=? WHERE id=?',[sku,name,category,location,minimum,cost,id]);
  await audit(c,req,'UPDATE','spare_part',id,{oldName:old.name,name}); await c.commit(); return res.json({success:true,message:'Spare part updated.'});
 } catch(e){if(c)await c.rollback().catch(()=>{});return fail(res,e,'Could not update spare part.');} finally{if(c)c.release();}
});

router.delete('/spare-parts/:id', async (req,res) => {
 if (!canManage(req)) return res.status(403).json({success:false,message:'Permission denied.'});
 const partId=positive(req.params.id,'part ID'); let c;
 try {
  c=await pool.getConnection(); await c.beginTransaction();
  const [parts]=await c.execute('SELECT id,name FROM warehouse_parts WHERE id=? FOR UPDATE',[partId]);
  if(!parts.length){await c.rollback();return res.status(404).json({success:false,message:'Spare part not found.'});}
  const [moves]=await c.execute('SELECT id FROM warehouse_movements WHERE part_id=? LIMIT 1',[partId]);
  const [uses]=await c.execute('SELECT id FROM cmms_work_order_parts WHERE part_id=? LIMIT 1',[partId]);
  if(moves.length||uses.length){await c.rollback();return res.status(409).json({success:false,message:'This spare part has movement or work-order history and cannot be deleted. Keep the audit trail intact.'});}
  await audit(c,req,'DELETE','spare_part',partId,{name:parts[0].name});
  await c.execute('DELETE FROM warehouse_parts WHERE id=?',[partId]);
  await c.commit(); return res.json({success:true,message:'Spare part deleted.'});
 } catch(e) {if(c)await c.rollback().catch(()=>{});return fail(res,e,'Could not delete spare part.');}
 finally {if(c)c.release();}
});

router.post('/stock-movements', async (req,res) => {
 if (!canManage(req)) return res.status(403).json({success:false,message:'Permission denied.'}); let c;
 try { const b=req.body||{}, id=positive(b.partId??b.part_id,'part ID'), type=String(b.type||b.movementType||'').toUpperCase(), qty=positive(b.quantity,'quantity',type==='ADJUST'); if(!['IN','OUT','ADJUST'].includes(type)) throw new Error('Invalid movement type.'); const reason=text(b.reason,'reason',500,true); c=await pool.getConnection(); await c.beginTransaction(); const [rows]=await c.execute('SELECT id,stock_quantity AS stock FROM warehouse_parts WHERE id=? FOR UPDATE',[id]); if(!rows.length){await c.rollback();return res.status(404).json({success:false,message:'Spare part not found.'});} const before=Number(rows[0].stock), after=type==='IN'?before+qty:type==='OUT'?before-qty:qty; if(after<0){await c.rollback();return res.status(409).json({success:false,message:'Insufficient stock.'});} await c.execute('UPDATE warehouse_parts SET stock_quantity=? WHERE id=?',[after,id]); const [r]=await c.execute('INSERT INTO warehouse_movements (part_id,movement_type,quantity,reason,created_by_user_id) VALUES (?,?,?,?,?)',[id,type.toLowerCase(),type==='ADJUST'?Math.abs(after-before):qty,reason,actorId(req)]); await audit(c,req,'STOCK_'+type,'spare_part',id,{quantity:qty,before,after,reason}); await c.commit(); return res.status(201).json({success:true,data:{id:r.insertId,stockBefore:before,stockAfter:after}}); } catch(e){if(c)await c.rollback().catch(()=>{});return fail(res,e,'Could not record stock movement.');} finally{if(c)c.release();}
});
router.get('/stock-movements', async(req,res)=>{try{const [rows]=await pool.execute('SELECT sm.id,sm.part_id,UPPER(sm.movement_type) AS movement_type,sm.quantity,sm.reason,sm.created_by_user_id AS created_by,sm.created_at,sp.sku,sp.name AS part_name FROM warehouse_movements sm JOIN warehouse_parts sp ON sp.id=sm.part_id ORDER BY sm.created_at DESC,sm.id DESC LIMIT 1000');return res.json({success:true,data:rows});}catch(e){return fail(res,e,'Could not retrieve stock movements.');}});

// Production records: role-limited writes and validated quality quantities.
router.get('/production-records', async(req,res)=>{if(!['admin','production_chief'].includes(req.user?.role))return res.status(403).json({success:false,message:'Permission denied.'});try{const [rows]=await pool.execute('SELECT * FROM production_records ORDER BY production_date DESC,id DESC LIMIT 5000');return res.json({success:true,data:rows});}catch(e){return fail(res,e,'Could not retrieve production records.');}});
router.post('/production-records', async(req,res)=>{if(!['admin','production_chief'].includes(req.user?.role))return res.status(403).json({success:false,message:'Permission denied.'});let c;try{const b=req.body||{}, date=text(b.date??b.productionDate,'production date',10), product=text(b.product,'product',200), shift=b.shift||'day', target=positive(b.target,'target quantity',true), produced=positive(b.produced,'produced quantity',true), accepted=positive(b.accepted,'accepted quantity',true), rejected=positive(b.rejected??0,'rejected quantity',true);if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Invalid production date.');if(!['day','evening','night'].includes(shift))throw new Error('Invalid shift.');if(accepted+rejected>produced)throw new Error('Invalid quality quantities.');const time=v=>v?(/^([01]\d|2[0-3]):[0-5]\d$/.test(v)?v+':00':(()=>{throw new Error('Invalid time.')})()):null;if(b.machineId||b.machine_id){const [ms]=await pool.execute('SELECT state FROM machines WHERE id=? LIMIT 1',[b.machineId||b.machine_id]);if(ms.length && String(ms[0].state).toLowerCase()==='broken')throw new Error('Selected machine is currently broken or out of service.');}c=await pool.getConnection();await c.beginTransaction();const [r]=await c.execute('INSERT INTO production_records (production_date,shift,product,workshop_id,machine_id,target_quantity,produced_quantity,accepted_quantity,rejected_quantity,start_time,end_time,notes,created_by_user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',[date,shift,product,b.workshopId||null,b.machineId||null,target,produced,accepted,rejected,time(b.startTime),time(b.endTime),text(b.notes,'notes',5000,true),actorId(req)]);await audit(c,req,'CREATE','production_record',r.insertId,{date,product,produced});await c.commit();return res.status(201).json({success:true,data:{id:r.insertId}});}catch(e){if(c)await c.rollback().catch(()=>{});return fail(res,e,'Could not create production record.');}finally{if(c)c.release();}});

router.delete('/production-records/:id', async(req,res)=>{
 if(!['admin','production_chief'].includes(req.user?.role))return res.status(403).json({success:false,message:'Permission denied.'});
 const recordId=positive(req.params.id,'production record ID'); let c;
 try {
  c=await pool.getConnection(); await c.beginTransaction();
  const [rows]=await c.execute('SELECT * FROM production_records WHERE id=? FOR UPDATE',[recordId]);
  if(!rows.length){await c.rollback();return res.status(404).json({success:false,message:'Production record not found.'});}
  await c.execute('INSERT INTO audit_trail (table_name,record_id,action,actor_id,old_data,new_data) VALUES (?,?,?,?,?,?)',['production_records',String(recordId),'DELETE',actorId(req),JSON.stringify(rows[0]),JSON.stringify({event:'DELETE',role:req.user?.role||null,ip:req.ip||null})]);
  await c.execute('DELETE FROM production_records WHERE id=?',[recordId]); await c.commit();
  return res.json({success:true,message:'Production record deleted and retained in audit history.'});
 } catch(e){if(c)await c.rollback().catch(()=>{});return fail(res,e,'Could not delete production record.');}
 finally {if(c)c.release();}
});

router.get('/preventive-plans', async(req,res)=>{try{const [rows]=await pool.execute('SELECT p.*,m.code AS machine_code,m.name AS machine_name FROM cmms_preventive_plans p LEFT JOIN machines m ON m.id=p.machine_id ORDER BY p.next_due_at');return res.json({success:true,data:rows});}catch(e){return fail(res,e,'Could not retrieve preventive plans.');}});
router.post('/preventive-plans', async(req,res)=>{
 if(!canManage(req))return res.status(403).json({success:false,message:'Permission denied.'});let c;
 try{const b=req.body||{},machine=positive(b.machineId??b.machine_id,'machine ID'),title=text(b.title,'plan title',200),days=positive(b.frequencyDays??b.frequency_days,'frequency days');if(!Number.isInteger(days)||days>3650)throw new Error('Invalid frequency days.');const due=text(b.nextDueAt??b.next_due_at,'next due date',25);if(Number.isNaN(Date.parse(due)))throw new Error('Invalid next due date.');c=await pool.getConnection();await c.beginTransaction();const [machines]=await c.execute('SELECT id FROM machines WHERE id=?',[machine]);if(!machines.length){await c.rollback();return res.status(400).json({success:false,message:'Selected machine does not exist.'});}const description=text(b.description,'description',5000,true);const [r]=await c.execute('INSERT INTO cmms_preventive_plans (machine_id,title,description,frequency_days,next_due_at,created_by) VALUES (?,?,?,?,?,?)',[machine,title,description,days,due,actorId(req)]);await audit(c,req,'CREATE','cmms_preventive_plans',r.insertId,{machine_id:machine,title,frequency_days:days,next_due_at:due});await c.commit();return res.status(201).json({success:true,data:{id:r.insertId}});}catch(e){if(c)await c.rollback().catch(()=>{});return fail(res,e,'Could not create preventive plan.');}finally{if(c)c.release();}
});

router.put('/preventive-plans/:id', async(req,res)=>{
 if(!canManage(req))return res.status(403).json({success:false,message:'Permission denied.'});
 const planId=positive(req.params.id,'plan ID');let c;
 try{
  const b=req.body||{};c=await pool.getConnection();await c.beginTransaction();
  const [rows]=await c.execute('SELECT * FROM cmms_preventive_plans WHERE id=? FOR UPDATE',[planId]);
  if(!rows.length){await c.rollback();return res.status(404).json({success:false,message:'Preventive plan not found.'});}
  const old=rows[0];
  const machine=b.machineId===undefined&&b.machine_id===undefined?Number(old.machine_id):positive(b.machineId??b.machine_id,'machine ID');
  const title=b.title===undefined?old.title:text(b.title,'plan title',200);
  const description=b.description===undefined?old.description:text(b.description,'description',5000,true);
  const days=b.frequencyDays===undefined&&b.frequency_days===undefined?Number(old.frequency_days):positive(b.frequencyDays??b.frequency_days,'frequency days');
  if(!Number.isInteger(days)||days>3650)throw new Error('Invalid frequency days.');
  const dueInput=b.nextDueAt??b.next_due_at;const due=dueInput===undefined?old.next_due_at:text(dueInput,'next due date',25);
  if(Number.isNaN(Date.parse(due)))throw new Error('Invalid next due date.');
  const active=b.active===undefined?Number(old.active):(b.active===true||b.active===1||b.active==='1'?1:b.active===false||b.active===0||b.active==='0'?0:null);
  if(active===null)throw new Error('Invalid active flag.');
  const [machines]=await c.execute('SELECT id FROM machines WHERE id=?',[machine]);if(!machines.length){await c.rollback();return res.status(400).json({success:false,message:'Selected machine does not exist.'});}
  await c.execute('UPDATE cmms_preventive_plans SET machine_id=?,title=?,description=?,frequency_days=?,next_due_at=?,active=? WHERE id=?',[machine,title,description,days,due,active,planId]);
  await c.execute('INSERT INTO audit_trail (table_name,record_id,action,actor_id,old_data,new_data) VALUES (?,?,?,?,?,?)',['cmms_preventive_plans',String(planId),'UPDATE',actorId(req),JSON.stringify(old),JSON.stringify({machine_id:machine,title,description,frequency_days:days,next_due_at:due,active})]);
  await c.commit();return res.json({success:true,message:'Preventive plan updated.',data:{id:planId,active}});
 }catch(e){if(c)await c.rollback().catch(()=>{});return fail(res,e,'Could not update preventive plan.');}finally{if(c)c.release();}
});


// Safety inspections are first-class server records (never browser-local notes).
router.get('/safety-inspections', async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT s.*, m.code AS machine_code, m.name AS machine_name
      FROM cmms_safety_inspections s LEFT JOIN machines m ON m.id=s.machine_id
      ORDER BY s.inspection_date DESC, s.id DESC`);
    return res.json({ success: true, data: rows });
  } catch (e) { return fail(res, e, 'Could not retrieve safety inspections. Apply the Operations Hub migration first.'); }
});
router.post('/safety-inspections', async (req, res) => {
  if (!canManage(req)) return res.status(403).json({ success: false, message: 'Permission denied.' });
  try {
    const b=req.body||{}, title=text(b.title,'inspection title',200), date=text(b.inspectionDate??b.inspection_date,'inspection date',10);
    const result=String(b.result||'OBSERVATION').toUpperCase();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !['COMPLIANT','OBSERVATION','HAZARD'].includes(result)) throw new Error('Invalid inspection date or result.');
    const machine=b.machineId??b.machine_id??null;
    if (machine!==null) { const [m]=await pool.execute('SELECT id FROM machines WHERE id=?',[positive(machine,'machine ID')]); if(!m.length) throw new Error('Selected machine does not exist.'); }
    const c=await pool.getConnection();
    try { await c.beginTransaction(); const [r]=await c.execute('INSERT INTO cmms_safety_inspections (title,machine_id,inspection_date,inspector,result,notes,created_by) VALUES (?,?,?,?,?,?,?)',[title,machine,date,text(b.inspector,'inspector',160,true),result,text(b.notes,'notes',10000,true),actorId(req)]); await audit(c,req,'CREATE','cmms_safety_inspections',r.insertId,{title,machine_id:machine,inspection_date:date,result}); await c.commit(); return res.status(201).json({success:true,data:{id:r.insertId}}); }
    catch(error) { await c.rollback().catch(()=>{}); throw error; } finally { c.release(); }
  } catch(e) { return fail(res,e,'Could not create safety inspection.'); }
});
router.put('/safety-inspections/:id', async (req,res) => {
  if(!canManage(req)) return res.status(403).json({success:false,message:'Permission denied.'});
  const id=positive(req.params.id,'inspection ID'); let c;
  try {
    c=await pool.getConnection(); await c.beginTransaction();
    const [oldRows]=await c.execute('SELECT * FROM cmms_safety_inspections WHERE id=? FOR UPDATE',[id]);
    if(!oldRows.length){await c.rollback();return res.status(404).json({success:false,message:'Inspection not found.'});}
    const old=oldRows[0], b=req.body||{};
    const title=b.title===undefined?old.title:text(b.title,'inspection title',200);
    const machine=b.machineId===undefined&&b.machine_id===undefined?old.machine_id:(b.machineId??b.machine_id)||null;
    if(machine!==null){const [m]=await c.execute('SELECT id FROM machines WHERE id=?',[positive(machine,'machine ID')]);if(!m.length)throw new Error('Selected machine does not exist.');}
    const date=b.inspectionDate===undefined&&b.inspection_date===undefined?old.inspection_date:text(b.inspectionDate??b.inspection_date,'inspection date',10);
    const inspector=b.inspector===undefined?old.inspector:text(b.inspector,'inspector',160,true);
    const result=String(b.result??old.result).toUpperCase(); if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date).slice(0,10))||!['COMPLIANT','OBSERVATION','HAZARD'].includes(result))throw new Error('Invalid inspection date or result.');
    const notes=b.notes===undefined?old.notes:text(b.notes,'notes',10000,true);
    await c.execute('UPDATE cmms_safety_inspections SET title=?,machine_id=?,inspection_date=?,inspector=?,result=?,notes=? WHERE id=?',[title,machine,date,inspector,result,notes,id]);
    await c.execute('INSERT INTO audit_trail (table_name,record_id,action,actor_id,old_data,new_data) VALUES (?,?,?,?,?,?)',['cmms_safety_inspections',String(id),'UPDATE',actorId(req),JSON.stringify(old),JSON.stringify({title,machine_id:machine,inspection_date:date,inspector,result,notes})]);
    await c.commit(); return res.json({success:true,message:'Inspection updated.'});
  } catch(e){if(c)await c.rollback().catch(()=>{});return fail(res,e,'Could not update safety inspection.');} finally{if(c)c.release();}
});
router.delete('/safety-inspections/:id', async(req,res)=>{
  if(!canManage(req))return res.status(403).json({success:false,message:'Permission denied.'});
  const id=positive(req.params.id,'inspection ID');let c;
  try{c=await pool.getConnection();await c.beginTransaction();const [r]=await c.execute('SELECT * FROM cmms_safety_inspections WHERE id=? FOR UPDATE',[id]);if(!r.length){await c.rollback();return res.status(404).json({success:false,message:'Inspection not found.'});}await c.execute('INSERT INTO audit_trail (table_name,record_id,action,actor_id,old_data,new_data) VALUES (?,?,?,?,?,NULL)',['cmms_safety_inspections',String(id),'DELETE',actorId(req),JSON.stringify(r[0])]);await c.execute('DELETE FROM cmms_safety_inspections WHERE id=?',[id]);await c.commit();return res.json({success:true,message:'Inspection deleted.'});}catch(e){if(c)await c.rollback().catch(()=>{});return fail(res,e,'Could not delete inspection.');}finally{if(c)c.release();}
});

// Machine documents store metadata and a durable URL/path. Binary uploads must use configured object storage.
router.get('/machine-documents', async(req,res)=>{
  try{const [rows]=await pool.execute(`SELECT d.*,m.code AS machine_code,m.name AS machine_name FROM cmms_machine_documents d LEFT JOIN machines m ON m.id=d.machine_id ORDER BY d.created_at DESC,d.id DESC`);return res.json({success:true,data:rows});}
  catch(e){return fail(res,e,'Could not retrieve machine documents. Apply the Operations Hub migration first.');}
});
router.post('/machine-documents', async(req,res)=>{
  if(!canManage(req))return res.status(403).json({success:false,message:'Permission denied.'});
  try{const b=req.body||{},title=text(b.title,'document title',200),type=text(b.documentType??b.document_type??'OTHER','document type',80),machine=b.machineId??b.machine_id??null;if(machine!==null){const [m]=await pool.execute('SELECT id FROM machines WHERE id=?',[positive(machine,'machine ID')]);if(!m.length)throw new Error('Selected machine does not exist.');}const location=text(b.fileLocation??b.file_location??b.url,'file location',1000,true);if(location&&!/^(https:\/\/|\/|[A-Za-z]:\\)/i.test(location))throw new Error('File location must be an HTTPS URL or a server-managed path.');const c=await pool.getConnection();try{await c.beginTransaction();const reference=text(b.referenceCode??b.reference_code,'reference',120,true),notes=text(b.notes,'notes',10000,true);const [r]=await c.execute('INSERT INTO cmms_machine_documents (title,machine_id,document_type,reference_code,file_location,notes,created_by) VALUES (?,?,?,?,?,?,?)',[title,machine,type,reference,location,notes,actorId(req)]);await audit(c,req,'CREATE','cmms_machine_documents',r.insertId,{title,machine_id:machine,document_type:type,file_location:location});await c.commit();return res.status(201).json({success:true,data:{id:r.insertId}});}catch(error){await c.rollback().catch(()=>{});throw error;}finally{c.release();}}catch(e){return fail(res,e,'Could not create machine document.');}
});
router.put('/machine-documents/:id', async(req,res)=>{
  if(!canManage(req))return res.status(403).json({success:false,message:'Permission denied.'});const id=positive(req.params.id,'document ID');let c;
  try{c=await pool.getConnection();await c.beginTransaction();const [r]=await c.execute('SELECT * FROM cmms_machine_documents WHERE id=? FOR UPDATE',[id]);if(!r.length){await c.rollback();return res.status(404).json({success:false,message:'Document not found.'});}const old=r[0],b=req.body||{};const title=b.title===undefined?old.title:text(b.title,'document title',200);const machine=b.machineId===undefined&&b.machine_id===undefined?old.machine_id:(b.machineId??b.machine_id)||null;if(machine!==null){const [m]=await c.execute('SELECT id FROM machines WHERE id=?',[positive(machine,'machine ID')]);if(!m.length)throw new Error('Selected machine does not exist.');}const type=b.documentType===undefined&&b.document_type===undefined?old.document_type:text(b.documentType??b.document_type,'document type',80);const ref=b.referenceCode===undefined&&b.reference_code===undefined?old.reference_code:text(b.referenceCode??b.reference_code,'reference',120,true);const loc=b.fileLocation===undefined&&b.file_location===undefined&&b.url===undefined?old.file_location:text(b.fileLocation??b.file_location??b.url,'file location',1000,true);if(loc&&!/^(https:\/\/|\/|[A-Za-z]:\\)/i.test(loc))throw new Error('Invalid file location.');const notes=b.notes===undefined?old.notes:text(b.notes,'notes',10000,true);await c.execute('UPDATE cmms_machine_documents SET title=?,machine_id=?,document_type=?,reference_code=?,file_location=?,notes=? WHERE id=?',[title,machine,type,ref,loc,notes,id]);await c.execute('INSERT INTO audit_trail (table_name,record_id,action,actor_id,old_data,new_data) VALUES (?,?,?,?,?,?)',['cmms_machine_documents',String(id),'UPDATE',actorId(req),JSON.stringify(old),JSON.stringify({title,machine_id:machine,document_type:type,reference_code:ref,file_location:loc,notes})]);await c.commit();return res.json({success:true,message:'Document updated.'});}catch(e){if(c)await c.rollback().catch(()=>{});return fail(res,e,'Could not update document.');}finally{if(c)c.release();}
});
router.delete('/machine-documents/:id', async(req,res)=>{
  if(!canManage(req))return res.status(403).json({success:false,message:'Permission denied.'});const id=positive(req.params.id,'document ID');let c;
  try{c=await pool.getConnection();await c.beginTransaction();const [r]=await c.execute('SELECT * FROM cmms_machine_documents WHERE id=? FOR UPDATE',[id]);if(!r.length){await c.rollback();return res.status(404).json({success:false,message:'Document not found.'});}await c.execute('INSERT INTO audit_trail (table_name,record_id,action,actor_id,old_data,new_data) VALUES (?,?,?,?,?,NULL)',['cmms_machine_documents',String(id),'DELETE',actorId(req),JSON.stringify(r[0])]);await c.execute('DELETE FROM cmms_machine_documents WHERE id=?',[id]);await c.commit();return res.json({success:true,message:'Document deleted.'});}catch(e){if(c)await c.rollback().catch(()=>{});return fail(res,e,'Could not delete document.');}finally{if(c)c.release();}
});

router.delete('/preventive-plans/:id', async(req,res)=>{
 if(!canManage(req))return res.status(403).json({success:false,message:'Permission denied.'});const id=positive(req.params.id,'plan ID');let c;
 try{
  c=await pool.getConnection();await c.beginTransaction();
  const [r]=await c.execute('SELECT * FROM cmms_preventive_plans WHERE id=? FOR UPDATE',[id]);
  if(!r.length){await c.rollback();return res.status(404).json({success:false,message:'Preventive plan not found.'});}
  const plan=r[0];
  await c.execute('INSERT INTO audit_trail (table_name,record_id,action,actor_id,old_data,new_data) VALUES (?,?,?,?,?,NULL)',['cmms_preventive_plans',String(id),'DELETE',actorId(req),JSON.stringify(plan)]);

  // Checklist items belong to the plan and their results belong to the items.
  await c.execute('DELETE FROM cmms_work_order_checklist_results WHERE checklist_item_id IN (SELECT id FROM cmms_pm_checklist_items WHERE plan_id=?)',[id]);
  await c.execute('DELETE FROM cmms_pm_checklist_items WHERE plan_id=?',[id]);

  // Generated occurrences belong to the plan (cmms_pm_occurrences.plan_id is NOT NULL
  // with ON DELETE RESTRICT). The work order an occurrence produced is removed with it
  // while it is still untouched; if it carries real history it is kept as a standalone
  // work order and the occurrence record is dropped with an audit trail entry.
  const [occurrences]=await c.execute('SELECT * FROM cmms_pm_occurrences WHERE plan_id=? FOR UPDATE',[id]);
  let removedTasks=0,keptTasks=0;
  for(const occurrence of occurrences){
   let removable=false;
   if(occurrence.task_id){
    const [taskRows]=await c.execute('SELECT * FROM maintenance_tasks WHERE id=? FOR UPDATE',[occurrence.task_id]);
    const task=taskRows[0];
    if(task && !['COMPLETED','CANCELLED'].includes(String(task.status).toUpperCase())){
     const [logs]=await c.execute('SELECT id FROM maintenance_logs WHERE task_id=? LIMIT 1',[occurrence.task_id]);
     const [breakdowns]=await c.execute('SELECT id FROM cmms_breakdown_reports WHERE task_id=? LIMIT 1',[occurrence.task_id]);
     const [issuedParts]=await c.execute("SELECT id FROM cmms_work_order_parts WHERE task_id=? AND status <> 'RESERVED' LIMIT 1",[occurrence.task_id]);
     removable=!logs.length && !breakdowns.length && !issuedParts.length;
     if(removable){
      await c.execute('DELETE FROM cmms_work_order_checklist_results WHERE task_id=?',[occurrence.task_id]);
      await c.execute('DELETE FROM cmms_work_order_parts WHERE task_id=?',[occurrence.task_id]);
      await c.execute('INSERT INTO audit_trail (table_name,record_id,action,actor_id,old_data,new_data) VALUES (?,?,?,?,?,NULL)',['maintenance_tasks',String(occurrence.task_id),'DELETE',actorId(req),JSON.stringify(task)]);
      await c.execute('DELETE FROM maintenance_tasks WHERE id=?',[occurrence.task_id]);
      removedTasks++;
     }else{
      // The work order carries real history: it stays as a standalone work order.
      keptTasks++;
     }
    }else if(task){
     keptTasks++;
    }
   }
   await c.execute('INSERT INTO audit_trail (table_name,record_id,action,actor_id,old_data,new_data) VALUES (?,?,?,?,?,NULL)',['cmms_pm_occurrences',String(occurrence.id),'DELETE',actorId(req),JSON.stringify(occurrence)]);
   await c.execute('DELETE FROM cmms_pm_occurrences WHERE id=?',[occurrence.id]);
  }

  await c.execute('DELETE FROM cmms_preventive_plans WHERE id=?',[id]);
  await c.commit();
  const notes=[];
  if(removedTasks)notes.push(`${removedTasks} generated work order(s) were removed with the plan`);
  if(keptTasks)notes.push(`${keptTasks} work order(s) carrying maintenance history were kept`);
  return res.json({success:true,message:notes.length?`Preventive plan deleted. ${notes.join('; ')}.`:'Preventive plan deleted.'});
 }catch(e){if(c)await c.rollback().catch(()=>{});return fail(res,e,'Could not delete preventive plan.');}finally{if(c)c.release();}
});

router.get('/recent-activity', async(req,res)=>{
 try {
  const [rows]=await pool.execute('SELECT id,table_name,record_id,action,created_at FROM audit_trail ORDER BY created_at DESC,id DESC LIMIT 20');
  return res.json({success:true,data:rows.map(row=>({id:String(row.id),action:`${row.action} ${row.table_name}`,target:row.record_id==null?'—':String(row.record_id),date:row.created_at}))});
 } catch(e){return fail(res,e,'Could not retrieve recent activity.');}
});

router.get('/audit-events', async(req,res)=>{if(req.user?.role!=='admin')return res.status(403).json({success:false,message:'Administrator access required.'});try{const limit=Math.min(500,Math.max(1,Number(req.query.limit)||100));const [rows]=await pool.execute('SELECT id,actor_id AS actor_user_id,table_name AS entity_type,record_id AS entity_id,action,created_at,old_data,new_data AS details FROM audit_trail ORDER BY created_at DESC,id DESC LIMIT ?',[limit]);return res.json({success:true,data:rows});}catch(e){return fail(res,e,'Could not retrieve audit events.');}});
// Phase 1 control-center summary for maintenance and operations.
router.get('/control-center', async (req, res) => {
  try {
    const [[taskStats]] = await pool.execute(
      `SELECT COUNT(*) AS total,
        SUM(status IN ('PENDING','IN_PROGRESS')) AS open_count,
        SUM(status = 'WAITING_PARTS') AS waiting_parts,
        SUM(status IN ('PENDING','IN_PROGRESS') AND priority IN ('HIGH','CRITICAL')) AS urgent_count,
        SUM(status IN ('PENDING','IN_PROGRESS') AND due_date < NOW()) AS overdue_count
       FROM maintenance_tasks`);
    const [[partStats]] = await pool.execute(
      'SELECT COUNT(*) AS low_stock_count FROM warehouse_parts WHERE stock_quantity <= minimum_quantity');
    const [[planStats]] = await pool.execute(
      'SELECT COUNT(*) AS overdue_count FROM cmms_preventive_plans WHERE active = 1 AND next_due_at < NOW()');
    const [[breakdownStats]] = await pool.execute('SELECT COUNT(*) AS total FROM cmms_breakdown_reports');
    const [[safetyStats]] = await pool.execute("SELECT COUNT(*) AS total FROM cmms_safety_inspections WHERE result = 'HAZARD'");
    const [[technicianStats]] = await pool.execute(
      "SELECT COUNT(*) AS total, SUM(active <> 0 AND availability_status = 'available') AS available FROM technicians");
    const [[documentStats]] = await pool.execute('SELECT COUNT(*) AS total FROM cmms_machine_documents');

    const number = value => Number(value || 0);

    return res.json({
      success: true,
      data: {
        openWorkOrders: number(taskStats.open_count),
        waitingParts: number(taskStats.waiting_parts),
        urgentWorkOrders: number(taskStats.urgent_count),
        overdueWorkOrders: number(taskStats.overdue_count),
        lowStockParts: number(partStats.low_stock_count),
        overduePreventivePlans: number(planStats.overdue_count),
        breakdownReports: number(breakdownStats.total),
        safetyHazards: number(safetyStats.total),
        technicians: { total: number(technicianStats.total), available: number(technicianStats.available) },
        machineDocuments: number(documentStats.total),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not load control-center summary.' });
  }
});

// Phase C: production availability summary connected to maintenance state.
router.get('/production-availability', async (req, res) => {
  try {
    const [[machineStats]] = await pool.execute(
      "SELECT COUNT(*) AS total, SUM(LOWER(state) = 'working') AS available, SUM(LOWER(state) = 'maintenance') AS maintenance, SUM(LOWER(state) = 'broken') AS broken FROM machines");
    const [[orderStats]] = await pool.execute("SELECT COUNT(*) AS total FROM maintenance_tasks WHERE status NOT IN ('COMPLETED','CANCELLED')");
    const number = value => Number(value || 0);
    return res.json({ success: true, data: { totalMachines: number(machineStats.total), available: number(machineStats.available), maintenance: number(machineStats.maintenance), broken: number(machineStats.broken), openMaintenanceOrders: number(orderStats.total) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not load production availability.' });
  }
});

// Phase D: preventive maintenance compliance summary.
router.get('/pm-compliance', async (req, res) => {
  try {
    const [[planStats]] = await pool.execute('SELECT COUNT(*) AS total, SUM(active = 1) AS active_count, SUM(active = 1 AND next_due_at < NOW()) AS overdue_count FROM cmms_preventive_plans');
    const [[taskStats]] = await pool.execute("SELECT COUNT(*) AS total, SUM(status = 'COMPLETED') AS completed FROM maintenance_tasks WHERE maintenance_type = 'PREVENTIVE'");
    const totalTasks = Number(taskStats.total || 0);
    const completed = Number(taskStats.completed || 0);
    const compliance = totalTasks ? Math.round((completed / totalTasks) * 10000) / 100 : 100;
    return res.json({ success: true, data: { totalPlans: Number(planStats.total || 0), activePlans: Number(planStats.active_count || 0), overduePlans: Number(planStats.overdue_count || 0), preventiveTasks: totalTasks, completedPreventiveTasks: completed, compliancePercent: compliance } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not load PM compliance.' });
  }
});

// Phase E: spare-part availability check for maintenance work orders.
router.get('/parts-availability', async (req, res) => {
  try {
    const partId = Number(req.query.partId);
    const quantity = Number(req.query.quantity || 1);
    if (!Number.isInteger(partId) || partId < 1 || !Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid part ID or quantity.' });
    }
    const [rows] = await pool.execute('SELECT id, name, stock_quantity, minimum_quantity FROM warehouse_parts WHERE id = ? LIMIT 1', [partId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Spare part not found.' });
    const part = rows[0];
    const stock = Number(part.stock_quantity);
    return res.json({ success: true, data: { partId: part.id, name: part.name, requested: quantity, stock, sufficient: stock >= quantity, belowMinimumAfter: stock - quantity < Number(part.minimum_quantity) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not check parts availability.' });
  }
});

// Phase F: executive operational summary.
router.get('/executive-summary', async (req, res) => {
  try {
    const [[machineStats]] = await pool.execute(
      "SELECT COUNT(*) AS total, SUM(LOWER(state) = 'working') AS available, SUM(LOWER(state) = 'broken') AS broken FROM machines");
    const [[orderStats]] = await pool.execute("SELECT COUNT(*) AS total FROM maintenance_tasks WHERE status NOT IN ('COMPLETED','CANCELLED')");
    const [[lowStock]] = await pool.execute('SELECT COUNT(*) AS total FROM warehouse_parts WHERE stock_quantity <= minimum_quantity');
    const [[hazards]] = await pool.execute("SELECT COUNT(*) AS total FROM cmms_safety_inspections WHERE result='HAZARD'");
    const [[production]] = await pool.execute('SELECT COUNT(*) AS total, COALESCE(SUM(produced_quantity),0) AS produced FROM production_records');
    const number = value => Number(value || 0);
    return res.json({ success: true, data: {
      machines: { total: number(machineStats.total), available: number(machineStats.available), broken: number(machineStats.broken) },
      maintenance: { openWorkOrders: number(orderStats.total) },
      inventory: { lowStockParts: number(lowStock.total) },
      safety: { hazards: number(hazards.total) },
      production: { records: number(production.total), producedQuantity: number(production.produced) },
    } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not load executive summary.' });
  }
});

// Unified machine history: merges work orders, maintenance logs, safety inspections, documents, and PM occurrences.
router.get('/machines/:id/history', async (req, res) => {
  const machineId = Number(req.params.id);
  if (!Number.isSafeInteger(machineId) || machineId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid machine ID.' });
  }
  try {
    const [machine] = await pool.execute('SELECT id, code, name, state FROM machines WHERE id = ? LIMIT 1', [machineId]);
    if (!machine.length) return res.status(404).json({ success: false, message: 'Machine not found.' });

    // A technician only sees their own work orders, logs and attachments on the machine.
    let ownTechnicianId = null;
    if (req.user?.role === 'maintenance_worker') {
      const [technician] = await pool.execute('SELECT id FROM technicians WHERE user_id = ? LIMIT 1', [actorId(req)]);
      ownTechnicianId = technician.length ? technician[0].id : -1;
    }
    const ownTaskFilter = ownTechnicianId === null ? '' : ' AND t.technician_id = ?';
    const ownTaskParams = ownTechnicianId === null ? [] : [ownTechnicianId];
    const ownLogFilter = ownTechnicianId === null ? '' : ' AND l.technician_id = ?';
    const ownLogParams = ownTechnicianId === null ? [] : [ownTechnicianId];

    const [tasks] = await pool.execute(
      `SELECT t.id, t.title, t.description, t.maintenance_type, t.priority, t.status, t.due_date, t.created_at, t.started_at, t.completed_at,
              tech.name AS technician_name, w.name AS workshop_name
       FROM maintenance_tasks t
       LEFT JOIN technicians tech ON tech.id = t.technician_id
       LEFT JOIN workshops w ON w.id = t.workshop_id
       WHERE t.machine_id = ?${ownTaskFilter}
       ORDER BY t.created_at DESC, t.id DESC`,
      [machineId, ...ownTaskParams]
    );

    const [logs] = await pool.execute(
      `SELECT l.id, l.maintenance_type, l.maintenance_date, l.duration_hours, l.cost, l.problem_description, l.work_performed, l.diagnosis,
              l.submission_status, l.submitted_at, l.task_id, tech.name AS technician_name,
              m.code AS machine_code
       FROM maintenance_logs l
       LEFT JOIN technicians tech ON tech.id = l.technician_id
       LEFT JOIN machines m ON m.id = l.machine_id
       WHERE l.machine_id = ?${ownLogFilter}
       ORDER BY l.maintenance_date DESC, l.id DESC`,
      [machineId, ...ownLogParams]
    );

    const [attachments] = await pool.execute(
      `SELECT a.id, a.maintenance_log_id, a.attachment_type, a.original_filename, a.mime_type, a.size_bytes, a.created_at
       FROM maintenance_log_attachments a
       JOIN maintenance_logs l ON l.id = a.maintenance_log_id
       WHERE l.machine_id = ?${ownLogFilter}
       ORDER BY a.created_at DESC`,
      [machineId, ...ownLogParams]
    );

    const [inspections] = await pool.execute(
      `SELECT s.id, s.title, s.inspection_date, s.inspector, s.result, s.notes, s.created_at
       FROM cmms_safety_inspections s
       WHERE s.machine_id = ?
       ORDER BY s.inspection_date DESC, s.id DESC`,
      [machineId]
    );

    const [documents] = await pool.execute(
      `SELECT d.id, d.title, d.document_type, d.reference_code, d.file_location, d.notes, d.created_at
       FROM cmms_machine_documents d
       WHERE d.machine_id = ?
       ORDER BY d.created_at DESC, d.id DESC`,
      [machineId]
    );

    const [pmOccurrences] = await pool.execute(
      `SELECT o.id, o.plan_id, o.due_at, o.created_at, o.task_id, p.title AS plan_title, p.frequency_days
       FROM cmms_pm_occurrences o
       LEFT JOIN cmms_preventive_plans p ON p.id = o.plan_id
       WHERE p.machine_id = ?
       ORDER BY o.due_at DESC, o.id DESC`,
      [machineId]
    );

    const [breakdowns] = await pool.execute(
      `SELECT b.id, b.symptom, b.root_cause, b.corrective_action, b.outcome, b.reported_at, b.severity, b.downtime_minutes,
              b.machine_id, m.code AS machine_code
       FROM cmms_breakdown_reports b
       LEFT JOIN machines m ON m.id = b.machine_id
       WHERE b.machine_id = ?
       ORDER BY b.reported_at DESC, b.id DESC`,
      [machineId]
    );

    return res.json({
      success: true,
      data: {
        machine: machine[0],
        workOrders: tasks,
        maintenanceLogs: logs,
        attachments,
        safetyInspections: inspections,
        machineDocuments: documents,
        preventiveOccurrences: pmOccurrences,
        breakdownReports: breakdowns,
      },
    });
  } catch (error) {
    console.error('Failed to load machine history:', error.message);
    return res.status(500).json({ success: false, message: 'Could not load machine history.' });
  }
});

module.exports=router;
