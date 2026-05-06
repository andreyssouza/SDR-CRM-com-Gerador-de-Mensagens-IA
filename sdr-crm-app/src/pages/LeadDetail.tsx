import { useParams } from 'react-router-dom'

export function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Lead</h1>
      <p className="text-gray-500 mt-1">ID: {id}</p>
    </div>
  )
}
