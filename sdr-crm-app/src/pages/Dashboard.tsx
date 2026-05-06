import { Users, MessageSquare, Zap, RefreshCw, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useDashboard } from '@/hooks/useDashboard'
import { cn } from '@/lib/utils'

const ACTIVITY_LABELS: Record<string, string> = {
  lead_created:       'Lead criado',
  lead_moved:         'Lead movido de etapa',
  lead_updated:       'Lead atualizado',
  message_generated:  'Mensagem gerada',
  message_sent:       'Mensagem enviada',
  campaign_applied:   'Campanha aplicada',
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads by stage */}
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
                  <div className="w-8 text-right text-xs font-semibold text-gray-700 shrink-0">
                    {count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
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
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
