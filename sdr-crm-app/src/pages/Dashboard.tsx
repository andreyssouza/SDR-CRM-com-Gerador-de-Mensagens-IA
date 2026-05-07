import { Users, MessageSquare, Zap, RefreshCw, TrendingUp, BarChart2, ArrowRight, Calendar } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/Button'
import { useDashboard } from '@/hooks/useDashboard'
import type { LeadsPerWeek, MessagesByCampaign, StageTransition } from '@/hooks/useDashboard'
import { cn } from '@/lib/utils'
import type { PipelineStage } from '@/lib/types'

const ACTIVITY_LABELS: Record<string, string> = {
  lead_created:       'Lead criado',
  lead_moved:         'Lead movido de etapa',
  lead_updated:       'Lead atualizado',
  message_generated:  'Mensagem gerada',
  message_sent:       'Mensagem enviada',
  campaign_applied:   'Campanha aplicada',
}

const CHANNEL_LABELS: Record<string, string> = {
  email:    'Email',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
  other:    'Outro',
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={cn('w-11 h-11 rounded-lg flex items-center justify-center shrink-0', color)}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function LeadsPerWeekChart({ data }: { data: LeadsPerWeek[] }) {
  if (!data.length) {
    return <p className="text-sm text-gray-400 text-center py-8">Sem dados de período</p>
  }

  const chartData = data.map(d => {
    const [y, m, day] = d.week_start.split('-').map(Number)
    const label = new Date(y, m - 1, day).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    return { label, leads: d.lead_count }
  })

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} barCategoryGap="30%" margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: '#f5f3ff' }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          formatter={(value) => [value, 'Leads']}
        />
        <Bar dataKey="leads" fill="#6366f1" radius={[6, 6, 0, 0]} label={{ position: 'top', fontSize: 12, fontWeight: 700, fill: '#374151' }} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ConversionTable({
  transitions,
  stages,
}: {
  transitions: StageTransition[]
  stages: { stage: PipelineStage; count: number }[]
}) {
  const stageMap = Object.fromEntries(stages.map(s => [s.stage.id, s.stage]))

  if (!transitions.length) {
    return <p className="text-sm text-gray-400 text-center py-6">Nenhuma movimentação registrada</p>
  }

  const sorted = [...transitions].sort((a, b) => b.transition_count - a.transition_count).slice(0, 8)
  const maxCount = Math.max(...sorted.map(t => t.transition_count), 1)

  return (
    <div className="space-y-2">
      {sorted.map((t, i) => {
        const from = stageMap[t.from_stage_id]
        const to   = stageMap[t.to_stage_id]
        if (!from || !to) return null
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="px-2 py-0.5 rounded-full font-medium text-white shrink-0"
              style={{ backgroundColor: from.color ?? '#6366f1' }}
            >
              {from.name}
            </span>
            <ArrowRight size={12} className="text-gray-400 shrink-0" />
            <span
              className="px-2 py-0.5 rounded-full font-medium text-white shrink-0"
              style={{ backgroundColor: to.color ?? '#6366f1' }}
            >
              {to.name}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden ml-1">
              <div
                className="h-full bg-brand-400 rounded-full"
                style={{ width: `${(t.transition_count / maxCount) * 100}%` }}
              />
            </div>
            <span className="font-semibold text-gray-700 shrink-0 w-5 text-right">{t.transition_count}</span>
          </div>
        )
      })}
    </div>
  )
}

function MessagesByCampaignList({ data }: { data: MessagesByCampaign[] }) {
  if (!data.length) {
    return <p className="text-sm text-gray-400 text-center py-6">Nenhuma mensagem gerada</p>
  }
  const maxGenerated = Math.max(...data.map(d => d.total_generated), 1)

  return (
    <div className="space-y-3">
      {data.map(d => (
        <div key={d.campaign_id}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium text-gray-700 truncate">{d.campaign_name}</span>
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">
                {CHANNEL_LABELS[d.channel] ?? d.channel}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2 text-[10px]">
              <span className="text-green-600 font-semibold">{d.total_sent} enviadas</span>
              <span className="text-gray-400">{d.total_generated} geradas</span>
            </div>
          </div>
          <div className="flex gap-0.5 h-1.5">
            <div
              className="rounded-l-full bg-green-400"
              style={{ width: `${(d.total_sent / maxGenerated) * 100}%` }}
            />
            <div
              className="bg-amber-300"
              style={{ width: `${(d.total_draft / maxGenerated) * 100}%` }}
            />
            <div
              className="rounded-r-full bg-gray-200 flex-1"
            />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3 pt-1 text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Enviadas</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-300 inline-block" /> Rascunho</span>
      </div>
    </div>
  )
}

export function Dashboard() {
  const { data, isLoading, error, refetch } = useDashboard()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-brand-600" size={24} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">{error}</p>
      </div>
    )
  }

  const maxCount = Math.max(...(data?.leadsByStage.map(s => s.count) ?? [1]), 1)

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão geral dos seus leads e campanhas</p>
        </div>
        <Button variant="secondary" size="sm" onClick={refetch}>
          <RefreshCw size={14} />
          Atualizar
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Leads ativos"
          value={data?.totalLeads ?? 0}
          icon={Users}
          color="bg-brand-50 text-brand-600"
        />
        <StatCard
          label="Mensagens enviadas"
          value={data?.messagesSent ?? 0}
          icon={MessageSquare}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          label="Campanhas ativas"
          value={data?.activeCampaigns ?? 0}
          icon={Zap}
          color="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Row 1: leads by stage + recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-brand-600" />
            <h2 className="text-sm font-semibold text-gray-800">Leads por etapa</h2>
          </div>
          {data?.leadsByStage.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma etapa configurada</p>
          ) : (
            <div className="space-y-3">
              {data?.leadsByStage.map(({ stage, count }) => (
                <div key={stage.id} className="flex items-center gap-3">
                  <div className="w-36 shrink-0 text-xs text-gray-600 truncate" title={stage.name}>
                    {stage.name}
                    {stage.is_trigger && (
                      <span className="ml-1 text-amber-500" title="Gatilho automático">⚡</span>
                    )}
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(count / maxCount) * 100}%`,
                        backgroundColor: stage.color ?? '#6366f1',
                      }}
                    />
                  </div>
                  <div className="w-8 text-right text-xs font-semibold text-gray-700 shrink-0">{count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Atividade recente</h2>
          {!data?.recentActivity.length ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma atividade ainda</p>
          ) : (
            <ol className="flex-1 space-y-3 overflow-y-auto">
              {data.recentActivity.map(log => (
                <li key={log.id} className="flex gap-3 items-start">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700">
                      {ACTIVITY_LABELS[log.type] ?? log.type}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleString('pt-BR', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Row 2: leads per week + conversion rates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-brand-600" />
            <h2 className="text-sm font-semibold text-gray-800">Leads por semana</h2>
          </div>
          <LeadsPerWeekChart data={data?.leadsPerWeek ?? []} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ArrowRight size={16} className="text-brand-600" />
            <h2 className="text-sm font-semibold text-gray-800">Conversão entre etapas</h2>
          </div>
          <ConversionTable
            transitions={data?.stageTransitions ?? []}
            stages={data?.leadsByStage ?? []}
          />
        </div>
      </div>

      {/* Row 3: messages by campaign */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={16} className="text-brand-600" />
          <h2 className="text-sm font-semibold text-gray-800">Mensagens por campanha</h2>
        </div>
        <MessagesByCampaignList data={data?.messagesByCampaign ?? []} />
      </div>
    </div>
  )
}
