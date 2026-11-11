import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const allowedRoles = new Set(['admin', 'production_chief', 'maintenance_worker', 'workshop_head'])

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'Server auth environment is incomplete.' }, 500)

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Authentication required.' }, 401)
  const token = authorization.slice('Bearer '.length)
  const callerClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authorization } } })
  const { data: userResult, error: userError } = await callerClient.auth.getUser(token)
  if (userError || !userResult.user) return json({ error: 'Invalid session.' }, 401)

  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: callerProfile, error: profileError } = await adminClient.from('profiles').select('role,active').eq('id', userResult.user.id).maybeSingle()
  if (profileError || !callerProfile?.active || callerProfile.role !== 'admin') return json({ error: 'Only an active administrator can create accounts.' }, 403)

  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return json({ error: 'Invalid JSON body.' }, 400) }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
  const role = typeof body.role === 'string' ? body.role : ''
  const workshopId = typeof body.workshopId === 'string' && body.workshopId ? body.workshopId : null
  if (!email || !email.includes('@') || password.length < 12 || !fullName || !allowedRoles.has(role)) return json({ error: 'Provide a valid email, full name, allowed role, and password of at least 12 characters.' }, 400)
  if (['maintenance_worker', 'workshop_head'].includes(role) && !workshopId) return json({ error: 'A workshop is required for this role.' }, 400)
  if (workshopId) {
    const { data: workshop, error } = await adminClient.from('workshops').select('id').eq('id', workshopId).maybeSingle()
    if (error || !workshop) return json({ error: 'Selected workshop does not exist.' }, 400)
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (createError || !created.user) return json({ error: createError?.message ?? 'Could not create the user.' }, 400)

  const { error: updateError } = await adminClient.from('profiles').update({ email, full_name: fullName, role, workshop_id: workshopId, active: true }).eq('id', created.user.id)
  if (updateError) {
    await adminClient.auth.admin.deleteUser(created.user.id)
    return json({ error: `Profile setup failed: ${updateError.message}` }, 500)
  }
  return json({ id: created.user.id, email, role }, 201)
})
