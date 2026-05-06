import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth ──────────────────────────────────────────────────
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
    const supabaseKey  = Deno.env.get('SUPABASE_ANON_KEY')!
    const openaiKey    = Deno.env.get('OPENAI_API_KEY')!

    // Client autenticado com o JWT do usuário (respeita RLS)
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Client com service role para inserir generated_messages / activity_logs
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Body ──────────────────────────────────────────────────
    const { lead_id, campaign_id } = await req.json() as {
      lead_id: string
      campaign_id: string
    }

    if (!lead_id || !campaign_id) {
      return new Response(JSON.stringify({ error: 'lead_id and campaign_id are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Fetch user ────────────────────────────────────────────
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Fetch lead ────────────────────────────────────────────
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, workspace_id, name, email, company, role')
      .eq('id', lead_id)
      .single()

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: 'Lead not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Fetch campaign ────────────────────────────────────────
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, workspace_id, name, channel, context, prompt, is_active')
      .eq('id', campaign_id)
      .single()

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!campaign.is_active) {
      return new Response(JSON.stringify({ error: 'Campaign is not active' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Garante que lead e campanha pertencem ao mesmo workspace
    if (lead.workspace_id !== campaign.workspace_id) {
      return new Response(JSON.stringify({ error: 'Resource workspace mismatch' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Build prompt ──────────────────────────────────────────
    const resolvedPrompt = campaign.prompt
      .replace(/\{\{nome\}\}/gi,    lead.name    ?? '')
      .replace(/\{\{empresa\}\}/gi, lead.company ?? '')
      .replace(/\{\{cargo\}\}/gi,   lead.role    ?? '')
      .replace(/\{\{email\}\}/gi,   lead.email   ?? '')

    const systemMessage = `Você é um especialista em SDR (Sales Development Representative) com anos de experiência em prospecção B2B.

Contexto da empresa que está prospectando:
${campaign.context}

Instruções:
- Escreva uma mensagem de prospecção personalizada e autêntica para o canal: ${campaign.channel}
- A mensagem deve ser direta, relevante e gerar interesse genuíno
- Evite clichês e linguagem genérica
- Para LinkedIn: seja profissional mas humano, 150-250 palavras
- Para Email: inclua assunto no formato "Assunto: ..." na primeira linha, depois uma linha em branco, depois o corpo
- Para WhatsApp: seja mais informal e conciso, máximo 150 palavras
- Não inclua placeholders não substituídos; se faltar informação, adapte naturalmente
- Retorne apenas o texto da mensagem, sem comentários adicionais`

    // ── Call OpenAI ───────────────────────────────────────────
    const MODEL = 'gpt-4o-mini'

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.8,
        max_tokens: 600,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user',   content: resolvedPrompt },
        ],
      }),
    })

    if (!openaiRes.ok) {
      const errBody = await openaiRes.text()
      console.error('OpenAI error:', errBody)
      return new Response(JSON.stringify({ error: 'OpenAI API error', detail: errBody }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const openaiData = await openaiRes.json()
    const content = openaiData.choices?.[0]?.message?.content?.trim() ?? ''

    if (!content) {
      return new Response(JSON.stringify({ error: 'Empty response from OpenAI' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Insert generated_message ──────────────────────────────
    const { data: message, error: insertError } = await supabaseAdmin
      .from('generated_messages')
      .insert({
        workspace_id: lead.workspace_id,
        lead_id:      lead.id,
        campaign_id:  campaign.id,
        generated_by: user.id,
        content,
        variation:    1,
        status:       'draft',
        prompt_used:  resolvedPrompt,
        model_used:   MODEL,
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to save message', detail: insertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Log activity ──────────────────────────────────────────
    await supabaseAdmin.from('activity_logs').insert({
      workspace_id: lead.workspace_id,
      lead_id:      lead.id,
      user_id:      user.id,
      type:         'message_generated',
      metadata: {
        campaign_id: campaign.id,
        message_id:  message.id,
        model:       MODEL,
        channel:     campaign.channel,
      },
    })

    return new Response(JSON.stringify({ message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Unhandled error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
