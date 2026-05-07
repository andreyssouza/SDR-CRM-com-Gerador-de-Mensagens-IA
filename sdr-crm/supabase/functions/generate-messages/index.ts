import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
    const supabaseKey  = Deno.env.get('SUPABASE_ANON_KEY')!
    const geminiKey    = Deno.env.get('GEMINI_API_KEY')

    if (!geminiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY secret not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { lead_id, campaign_id, variations = 3 } = await req.json() as {
      lead_id: string
      campaign_id: string
      variations?: number
    }

    if (!lead_id || !campaign_id) {
      return new Response(JSON.stringify({ error: 'lead_id and campaign_id are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const numVariations = Math.min(Math.max(1, variations), 5)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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

    if (lead.workspace_id !== campaign.workspace_id) {
      return new Response(JSON.stringify({ error: 'Resource workspace mismatch' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resolvedPrompt = campaign.prompt
      .replace(/\{\{nome\}\}/gi,    lead.name    ?? '')
      .replace(/\{\{empresa\}\}/gi, lead.company ?? '')
      .replace(/\{\{cargo\}\}/gi,   lead.role    ?? '')
      .replace(/\{\{email\}\}/gi,   lead.email   ?? '')

    const systemInstruction = `Você é um especialista em SDR (Sales Development Representative) com anos de experiência em prospecção B2B.

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

    const MODEL = 'gemini-2.5-flash'
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${geminiKey!}`

    const generatedContents: string[] = []

    for (let i = 0; i < numVariations; i++) {
      const geminiRes = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: resolvedPrompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 600 },
        }),
      })

      if (!geminiRes.ok) {
        const errBody = await geminiRes.text()
        console.error(`Gemini error (status ${geminiRes.status}):`, errBody)
        return new Response(JSON.stringify({ error: `Gemini API error (${geminiRes.status})`, detail: errBody }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const geminiData = await geminiRes.json()
      const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      if (text) generatedContents.push(text)
    }

    if (!generatedContents.length) {
      return new Response(JSON.stringify({ error: 'Empty response from Gemini' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const inserts = generatedContents.map((content, i) => ({
      workspace_id: lead.workspace_id,
      lead_id:      lead.id,
      campaign_id:  campaign.id,
      generated_by: user.id,
      content,
      variation:    i + 1,
      status:       'draft',
      prompt_used:  resolvedPrompt,
      model_used:   MODEL,
    }))

    const { data: messages, error: insertError } = await supabaseAdmin
      .from('generated_messages')
      .insert(inserts)
      .select('*')

    if (insertError) {
      console.error('Insert error:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to save messages', detail: insertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabaseAdmin.from('activity_logs').insert({
      workspace_id: lead.workspace_id,
      lead_id:      lead.id,
      user_id:      user.id,
      type:         'message_generated',
      metadata: {
        campaign_id:  campaign.id,
        variations:   inserts.length,
        model:        MODEL,
        channel:      campaign.channel,
      },
    })

    return new Response(JSON.stringify({ messages }), {
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
