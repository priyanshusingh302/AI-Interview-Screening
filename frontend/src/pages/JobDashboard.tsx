import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Phone, CheckCircle2, XCircle, Clock, ExternalLink, Download } from 'lucide-react';
import { format } from 'date-fns';

export function JobDashboard() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);

  const { data: job } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const res = await api.get(`/jobs/${id}`);
      return res.data;
    }
  });

  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ['candidates', id],
    queryFn: async () => {
      const res = await api.get(`/candidates?job_id=${id}`);
      return res.data;
    },
    refetchInterval: 5000 // Poll every 5s for MVP
  });

  const startInterview = useMutation({
    mutationFn: async () => {
      await api.post('/interviews/start', { candidate_ids: selectedCandidates });
    },
    onSuccess: () => {
      setSelectedCandidates([]);
      queryClient.invalidateQueries({ queryKey: ['candidates', id] });
      alert('Interviews initiated successfully!');
    }
  });

  const toggleSelect = (candidateId: string) => {
    setSelectedCandidates(prev => 
      prev.includes(candidateId) ? prev.filter(c => c !== candidateId) : [...prev, candidateId]
    );
  };

  const downloadPassedCSV = () => {
    const passed = (candidates || []).filter((c: any) => c.result === 'passed');
    if (passed.length === 0) { alert('No passed candidates to download.'); return; }
    const headers = ['Name', 'Email', 'Phone', 'Status', 'Applied Date'];
    const rows = passed.map((c: any) => [
      `"${c.name}"`,
      `"${c.email}"`,
      `"${c.phone}"`,
      `"${c.status}"`,
      `"${format(new Date(c.created_at), 'MMM d, yyyy')}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `passed-candidates-${job?.title?.replace(/\s+/g, '-') || id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'applied': return <Clock size={16} className="text-yellow-400" />;
      case 'calling': return <Phone size={16} className="text-primary animate-pulse" />;
      case 'in-progress': return <Phone size={16} className="text-primary animate-pulse" />;
      case 'initiated': return <Phone size={16} className="text-primary" />;
      case 'ringing': return <Phone size={16} className="text-primary animate-pulse" />;
      case 'completed': return <CheckCircle2 size={16} className="text-secondary" />;
      default: return <XCircle size={16} className="text-red-400" />;
    }
  };

  if (!job) return <div className="py-20 text-center text-textMuted">Loading dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="glass-panel p-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-textMuted mb-4">
              <span className="font-semibold text-textMain">{job.company_name}</span>
              <span>&bull;</span>
              <span>{job.location}</span>
              <span>&bull;</span>
              <span>{job.employment_type}</span>
              <span>&bull;</span>
              <span>{job.remote_type}</span>
            </div>
            <p className="text-textMuted max-w-2xl">{job.description}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <a href={`/apply/${id}`} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
              Public Link <ExternalLink size={14} />
            </a>

          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <h2 className="text-xl font-semibold">Candidates ({candidates?.length || 0})</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadPassedCSV}
              disabled={!candidates || candidates.filter((c: any) => c.result === 'passed').length === 0}
              className="border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-green-400 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
              <Download size={16} /> Download Passed ({(candidates || []).filter((c: any) => c.result === 'passed').length})
            </button>
            <button 
              disabled={selectedCandidates.length === 0 || startInterview.isPending}
              onClick={() => startInterview.mutate()}
              className="bg-primary hover:bg-blue-600 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <Phone size={18} /> {startInterview.isPending ? 'Initiating...' : `Start Interviews (${selectedCandidates.length})`}
            </button>
          </div>
        </div>

        <div className="glass-panel overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-background text-sm text-textMuted">
              <tr>
                <th className="p-4 w-12"><input type="checkbox" onChange={e => {
                  if(e.target.checked && candidates) setSelectedCandidates(candidates.filter((c: any) => ['applied', 'no-answer', 'call-disconnected'].includes(c.status)).map((c: any) => c._id));
                  else setSelectedCandidates([]);
                }} className="rounded bg-transparent border-border text-primary focus:ring-primary focus:ring-offset-background" /></th>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Contact</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Result</th>
                <th className="p-4 font-medium">Applied Date</th>
                <th className="p-4 font-medium text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {candidates?.map((candidate: any) => (
                <tr key={candidate._id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <input 
                      type="checkbox" 
                      checked={selectedCandidates.includes(candidate._id)}
                      onChange={() => toggleSelect(candidate._id)}
                      disabled={!['applied', 'no-answer', 'call-disconnected'].includes(candidate.status)}
                      className="rounded bg-transparent border-border text-primary disabled:opacity-30" 
                    />
                  </td>
                  <td className="p-4 font-medium text-textMain">{candidate.name}</td>
                  <td className="p-4 text-textMuted text-sm">
                    <div>{candidate.phone}</div>
                    <div className="text-xs opacity-70">{candidate.email}</div>
                  </td>
                  <td className="p-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                      ${candidate.status === 'completed' ? 'bg-secondary/10 text-secondary border-secondary/20' : 
                        ['calling', 'in-progress', 'initiated', 'ringing'].includes(candidate.status) ? 'bg-primary/10 text-primary border-primary/20' : 
                        candidate.status === 'applied' ? 'bg-black/5 text-textMuted border-border' :
                        'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {getStatusIcon(candidate.status)}
                      <span className="capitalize">{candidate.status.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {candidate.result ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${candidate.result === 'passed' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {candidate.result}
                      </span>
                    ) : (
                      <span className="text-textMuted text-xs">-</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-textMuted">
                    {format(new Date(candidate.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="p-4 text-right">
                    <Link to={`/admin/candidate/${candidate._id}`} className="text-primary hover:text-blue-400 font-medium text-sm transition-colors">
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
              {candidates?.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-textMuted">No candidates have applied yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
