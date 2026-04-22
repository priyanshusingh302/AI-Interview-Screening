import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Mic, FileText, CheckCircle2, Clock } from 'lucide-react';

export function CandidateReview() {
  const { id } = useParams();

  const { data: interview, isLoading: interviewLoading } = useQuery({
    queryKey: ['interview', id],
    queryFn: async () => {
      try {
        const res = await api.get(`/interviews/${id}`);
        return res.data;
      } catch (e) {
        return null;
      }
    },
    refetchInterval: 3000
  });

  const { data: candidate, isLoading: candidateLoading } = useQuery({
    queryKey: ['candidate', id],
    queryFn: async () => {
      try {
        const res = await api.get(`/candidates/${id}`);
        return res.data;
      } catch (e) {
        return null;
      }
    }
  });

  if (interviewLoading || candidateLoading) return <div className="text-center py-20 text-textMuted">Loading candidate data...</div>;

  if (!interview && !candidate) {
    return (
      <div className="glass-panel p-12 text-center max-w-xl mx-auto mt-10 space-y-4">
        <Clock size={48} className="mx-auto text-textMuted" />
        <h2 className="text-2xl font-bold">No Interview Data</h2>
        <p className="text-textMuted">No interview has been initiated for this candidate yet. Go back to the dashboard to start the screening call.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 flex justify-between items-center bg-gradient-to-br from-surface to-background relative overflow-hidden">
        <div className="relative z-10">
           <h1 className="text-2xl font-bold mb-1">{candidate?.name || 'Candidate Details'}</h1>
           <div className="flex gap-2 flex-wrap mt-2">
             <div className="text-textMuted text-sm font-mono bg-background px-3 py-1 inline-block rounded-md border border-border">Email: {candidate?.email}</div>
             <div className="text-textMuted text-sm font-mono bg-background px-3 py-1 inline-block rounded-md border border-border">Phone: {candidate?.phone}</div>
           </div>
        </div>
        <div className="relative z-10 text-right shrink-0">
           <div className="text-sm text-textMuted mb-1">Interview Status</div>
           <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border shadow-lg
              ${interview?.status === 'completed' ? 'bg-secondary/10 text-secondary border-secondary/20 shadow-secondary/10' : 
                interview?.status === 'calling' || interview?.status === 'in_progress' ? 'bg-primary/10 text-primary border-primary/20 shadow-primary/10' : 
                'bg-black/5 text-textMuted border-border'}`}>
              {interview?.status === 'completed' && <CheckCircle2 size={16} />}
              {(interview?.status === 'calling' || interview?.status === 'in_progress') && <Mic size={16} className="animate-pulse" />}
              <span className="capitalize">{interview ? interview.status.replace('_', ' ') : 'Not Started'}</span>
           </div>
        </div>
      </div>

      {candidate?.extra_fields && Object.keys(candidate.extra_fields).length > 0 && (
        <div className="glass-panel p-6">
          <h2 className="text-lg font-bold mb-4">Application Answers</h2>
          <div className="flex gap-4 flex-wrap">
             {candidate.resume_url && (
               <a href={candidate.resume_url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary hover:text-white transition-colors text-sm font-medium">View Resume</a>
             )}
             {Object.entries(candidate.extra_fields).map(([key, val]) => (
               <div key={key} className="px-4 py-2 bg-background border border-border rounded-lg text-sm">
                 <span className="text-textMuted capitalize mr-2">{key.replace(/_/g, ' ')}:</span>
                 {typeof val === 'string' && val.startsWith('http') ? (
                   <a href={val} target="_blank" rel="noreferrer" className="text-primary hover:underline">{val}</a>
                 ) : (
                   <span className="text-textMain font-medium">{String(val)}</span>
                 )}
               </div>
             ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 items-start">
        <div className="glass-panel p-6 space-y-4 h-[600px] flex flex-col">
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <Mic className="text-primary" size={20} />
            <h2 className="text-xl font-bold">Call Transcript</h2>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 mt-2">
            {interview?.transcript ? (
              <div className="text-textMain whitespace-pre-wrap leading-relaxed text-sm p-4 bg-surface rounded-xl border border-border font-mono shadow-inner">
                {interview.transcript}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-textMuted opacity-60">
                <Mic size={40} className="mb-4" />
                <p>Waiting for transcript to be generated</p>
                <p className="text-xs mt-2">Will appear here after call completes via webhook.</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel p-6 space-y-4 h-[600px] flex flex-col relative overflow-hidden">
          <div className="absolute top-[-100px] right-[-100px] w-64 h-64 bg-secondary/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="flex items-center gap-2 border-b border-border pb-4 relative z-10">
            <FileText className="text-secondary" size={20} />
            <h2 className="text-xl font-bold">AI Evaluation</h2>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 min-h-0 relative z-10 custom-scrollbar mt-2">
             {interview?.status === 'completed' && !interview.reasoning ? (
               <div className="h-full flex flex-col items-center justify-center text-textMuted">
                  <div className="w-8 h-8 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin mb-4" />
                  Evaluating candidate with LLM...
               </div>
             ) : interview?.reasoning ? (
               <div className="flex flex-col gap-4 max-w-none text-sm p-4 bg-surface rounded-xl border border-border shadow-inner">
                 <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold border max-w-max uppercase ${interview.result === 'passed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                   {interview.result}
                 </div>
                 <div className="text-textMain leading-relaxed" dangerouslySetInnerHTML={{ __html: String(interview.reasoning).replace(/\n/g, '<br/>') }} />
               </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-textMuted opacity-60">
                <FileText size={40} className="mb-4" />
                <p>No evaluation available yet</p>
                <p className="text-xs mt-2 text-center px-4">Evaluation will be generated automatically after the call and transcript are finalized.</p>
              </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
