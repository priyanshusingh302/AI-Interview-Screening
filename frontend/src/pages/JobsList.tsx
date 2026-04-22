import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Link } from 'react-router-dom';
import { Plus, Briefcase, ChevronRight } from 'lucide-react';

export function JobsList() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', company_name: '', location: '', employment_type: 'Full-time', 
    remote_type: 'Remote', experience_level: '', description: '', 
    responsibilities: '', requirements: '', skills: '', application_fields: 'resume_url'
  });

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const res = await api.get('/jobs/admin/all');
      return res.data;
    }
  });

  const createJob = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        skills: data.skills.split(',').map(s => s.trim()).filter(Boolean),
        application_fields: data.application_fields.split(',').map(s => s.trim()).filter(Boolean)
      };
      await api.post('/jobs', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setShowModal(false);
      setFormData({ 
        title: '', company_name: '', location: '', employment_type: 'Full-time', 
        remote_type: 'Remote', experience_level: '', description: '', 
        responsibilities: '', requirements: '', skills: '', application_fields: 'resume_url'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createJob.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Open Positions</h1>
          <p className="text-textMuted mt-1">Manage jobs and active screening candidates.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-blue-600 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]">
          <Plus size={20} /> New Job
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20 text-textMuted">Loading...</div>
      ) : jobs?.length === 0 ? (
        <div className="glass-panel p-12 text-center text-textMuted flex flex-col items-center gap-4">
          <Briefcase size={40} className="text-black/10" />
          <p>No open positions found. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs?.map((job: any) => (
            <Link key={job._id} to={`/admin/jobs/${job._id}`} className="block group">
              <div className="glass-panel p-6 hover:border-primary/50 transition-colors h-full flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-lg text-textMain group-hover:text-primary transition-colors">{job.title}</h3>
                  <span className="text-xs font-medium px-2 py-1 bg-secondary/10 text-secondary rounded-full border border-secondary/20 capitalize">{job.status}</span>
                </div>
                <p className="text-sm text-textMuted line-clamp-3 mb-6 flex-1">{job.description}</p>
                <div className="flex items-center text-primary text-sm font-medium mt-auto">
                  View Dashboard <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 py-12">
          <div className="glass-panel max-h-full overflow-y-auto bg-surface w-full max-w-3xl p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-textMain">Create New Position</h2>
              <button onClick={() => setShowModal(false)} className="text-textMuted hover:text-textMain">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-textMuted mb-1">Job Title</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-transparent border border-border rounded-lg px-4 py-2 text-textMain focus:outline-none focus:border-primary transition-colors" placeholder="e.g. Frontend Engineer" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textMuted mb-1">Company Name</label>
                  <input required type="text" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} className="w-full bg-transparent border border-border rounded-lg px-4 py-2 text-textMain focus:outline-none focus:border-primary transition-colors" placeholder="e.g. Acme Corp" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textMuted mb-1">Location</label>
                  <input required type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-transparent border border-border rounded-lg px-4 py-2 text-textMain focus:outline-none focus:border-primary transition-colors" placeholder="e.g. San Francisco, CA" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textMuted mb-1">Experience Level</label>
                  <input required type="text" value={formData.experience_level} onChange={e => setFormData({...formData, experience_level: e.target.value})} className="w-full bg-transparent border border-border rounded-lg px-4 py-2 text-textMain focus:outline-none focus:border-primary transition-colors" placeholder="e.g. 3-5 years" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textMuted mb-1">Employment Type</label>
                  <select value={formData.employment_type} onChange={e => setFormData({...formData, employment_type: e.target.value})} className="w-full bg-transparent border border-border rounded-lg px-4 py-2 text-textMain focus:outline-none focus:border-primary transition-colors">
                    <option>Full-time</option>
                    <option>Contract</option>
                    <option>Part-time</option>
                    <option>Internship</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-textMuted mb-1">Remote Type</label>
                  <select value={formData.remote_type} onChange={e => setFormData({...formData, remote_type: e.target.value})} className="w-full bg-transparent border border-border rounded-lg px-4 py-2 text-textMain focus:outline-none focus:border-primary transition-colors">
                    <option>Remote</option>
                    <option>Hybrid</option>
                    <option>Onsite</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-textMuted mb-1">Job Description</label>
                <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-transparent border border-border rounded-lg px-4 py-2 text-textMain focus:outline-none focus:border-primary transition-colors h-24" placeholder="Job description..." />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-textMuted mb-1">Key Responsibilities</label>
                <textarea required value={formData.responsibilities} onChange={e => setFormData({...formData, responsibilities: e.target.value})} className="w-full bg-transparent border border-border rounded-lg px-4 py-2 text-textMain focus:outline-none focus:border-primary transition-colors h-24" placeholder="Responsibilities..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-textMuted mb-1">Requirements</label>
                <textarea required value={formData.requirements} onChange={e => setFormData({...formData, requirements: e.target.value})} className="w-full bg-transparent border border-border rounded-lg px-4 py-2 text-textMain focus:outline-none focus:border-primary transition-colors h-20" placeholder="Requirements..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-textMuted mb-1">Skills (Comma separated)</label>
                  <input required type="text" value={formData.skills} onChange={e => setFormData({...formData, skills: e.target.value})} className="w-full bg-transparent border border-border rounded-lg px-4 py-2 text-textMain focus:outline-none focus:border-primary transition-colors" placeholder="React, Python, AWS..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textMuted mb-1">Application Fields</label>
                  <input required type="text" value={formData.application_fields} onChange={e => setFormData({...formData, application_fields: e.target.value})} className="w-full bg-transparent border border-border rounded-lg px-4 py-2 text-textMain focus:outline-none focus:border-primary transition-colors" placeholder="resume_url, portfolio, github" />
                </div>
              </div>


              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-textMuted hover:text-textMain transition-colors">Cancel</button>
                <button type="submit" disabled={createJob.isPending} className="bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50">
                  {createJob.isPending ? 'Creating...' : 'Create Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
