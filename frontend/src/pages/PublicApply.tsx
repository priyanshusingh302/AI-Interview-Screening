import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api';
import { CheckCircle2, Briefcase, MapPin, Clock, ChevronDown } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+1', label: 'United States (+1)' },
  { code: '+1', label: 'Canada (+1)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+39', label: 'Italy (+39)' },
  { code: '+34', label: 'Spain (+34)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+82', label: 'South Korea (+82)' },
  { code: '+86', label: 'China (+86)' },
  { code: '+55', label: 'Brazil (+55)' },
  { code: '+52', label: 'Mexico (+52)' },
  { code: '+54', label: 'Argentina (+54)' },
  { code: '+56', label: 'Chile (+56)' },
  { code: '+57', label: 'Colombia (+57)' },
  { code: '+27', label: 'South Africa (+27)' },
  { code: '+234', label: 'Nigeria (+234)' },
  { code: '+254', label: 'Kenya (+254)' },
  { code: '+20', label: 'Egypt (+20)' },
  { code: '+971', label: 'United Arab Emirates (+971)' },
  { code: '+966', label: 'Saudi Arabia (+966)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+60', label: 'Malaysia (+60)' },
  { code: '+62', label: 'Indonesia (+62)' },
  { code: '+63', label: 'Philippines (+63)' },
  { code: '+64', label: 'New Zealand (+64)' },
  { code: '+46', label: 'Sweden (+46)' },
  { code: '+47', label: 'Norway (+47)' },
  { code: '+45', label: 'Denmark (+45)' },
  { code: '+358', label: 'Finland (+358)' },
  { code: '+31', label: 'Netherlands (+31)' },
  { code: '+32', label: 'Belgium (+32)' },
  { code: '+41', label: 'Switzerland (+41)' },
  { code: '+43', label: 'Austria (+43)' },
  { code: '+48', label: 'Poland (+48)' },
  { code: '+7', label: 'Russia (+7)' },
  { code: '+380', label: 'Ukraine (+380)' },
  { code: '+90', label: 'Turkey (+90)' },
  { code: '+98', label: 'Iran (+98)' },
  { code: '+92', label: 'Pakistan (+92)' },
  { code: '+880', label: 'Bangladesh (+880)' },
  { code: '+94', label: 'Sri Lanka (+94)' },
  { code: '+95', label: 'Myanmar (+95)' },
  { code: '+84', label: 'Vietnam (+84)' },
  { code: '+66', label: 'Thailand (+66)' }
];

export function PublicApply() {
  const { job_id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', resume_url: '', extra_fields: {} as Record<string, string> });
  const [countryCode, setCountryCode] = useState('+1');
  const [rawPhone, setRawPhone] = useState('');

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['job', job_id],
    queryFn: async () => {
      const res = await api.get(`/jobs/${job_id}`);
      return res.data;
    }
  });

  const applyMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await api.post(`/apply/${job_id}`, data);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyMutation.mutate({
      ...formData,
      phone: `${countryCode}${rawPhone}`
    });
  };

  if (jobLoading) return <div className="text-center py-20 text-textMuted">Loading job details...</div>;
  if (!job) return <div className="text-center py-20 text-red-400">Job not found.</div>;

  if (applyMutation.isSuccess) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center p-12 glass-panel text-center animate-in fade-in zoom-in">
        <CheckCircle2 size={64} className="text-secondary mb-6 shadow-lg shadow-secondary/20 rounded-full bg-secondary/10" />
        <h2 className="text-3xl font-bold mb-4">Application Submitted!</h2>
        <p className="text-textMuted text-lg mb-8">Thank you for applying to the {job.title} position. If selected, you will receive an automated voice interview call.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12 items-start">
      
      {/* Left side: Job Details */}
      <div className="flex-1 space-y-8">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent primary-gradient mb-2">{job.title}</h1>
          <p className="text-xl font-medium text-textMain">{job.company_name}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-textMuted">
          <div className="flex items-center gap-1.5 bg-background py-1.5 px-3 rounded-full border border-border">
            <MapPin size={16} className="text-primary" /> {job.location} ({job.remote_type})
          </div>
          <div className="flex items-center gap-1.5 bg-background py-1.5 px-3 rounded-full border border-border">
            <Briefcase size={16} className="text-secondary" /> {job.employment_type} &bull; {job.experience_level}
          </div>
        </div>

        <div className="glass-panel p-8 space-y-8">
          <section>
            <h3 className="text-lg font-bold mb-3 border-b border-border pb-2">About the Role</h3>
            <p className="text-textMuted leading-relaxed whitespace-pre-wrap">{job.description}</p>
          </section>

          {job.responsibilities && (
            <section>
              <h3 className="text-lg font-bold mb-3 border-b border-border pb-2">Key Responsibilities</h3>
              <p className="text-textMuted leading-relaxed whitespace-pre-wrap">{job.responsibilities}</p>
            </section>
          )}

          <section>
            <h3 className="text-lg font-bold mb-3 border-b border-border pb-2">Requirements</h3>
            <p className="text-textMuted leading-relaxed whitespace-pre-wrap">{job.requirements}</p>
          </section>

          {job.skills && job.skills.length > 0 && (
            <section>
              <h3 className="text-lg font-bold mb-3 border-b border-border pb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill: string, index: number) => (
                  <span key={index} className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Right side: Application Form */}
      <div className="w-full lg:w-[450px] glass-panel p-8 sticky top-24">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Apply Now</h2>
          <p className="text-textMuted text-sm">Submit your information to process your candidacy.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-textMuted mb-2">Full Name</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-transparent border border-border rounded-xl px-4 py-3 text-textMain focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-medium" placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-textMuted mb-2">Email Address</label>
            <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-transparent border border-border rounded-xl px-4 py-3 text-textMain focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-medium" placeholder="john@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-textMuted mb-2">Phone Number</label>
            <div className="flex gap-3 relative">
              <div className="relative">
                <select 
                  required 
                  value={countryCode} 
                  onChange={e => setCountryCode(e.target.value)} 
                  className="w-32 bg-transparent border border-border rounded-xl px-4 py-3 text-textMain focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-medium appearance-none cursor-pointer pr-10 bg-surface"
                >
                  {COUNTRY_CODES.map((c, i) => (
                    <option key={i} value={c.code} className="bg-surface text-textMain">{c.label}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-textMuted">
                  <ChevronDown size={18} />
                </div>
              </div>
              <input required type="tel" value={rawPhone} onChange={e => setRawPhone(e.target.value.replace(/\D/g, ''))} className="flex-1 bg-transparent border border-border rounded-xl px-4 py-3 text-textMain focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-medium" placeholder="1234567890" pattern="^\d{5,14}$" title="Phone number digits only" />
            </div>
            <p className="text-xs text-textMuted mt-1">Country code (e.g. +1) and number</p>
          </div>

          {/* Dynamic Application Fields */}
          {job.application_fields?.map((field: string) => (
            <div key={field}>
              <label className="block text-sm font-medium text-textMuted mb-2 capitalize">{field.replace(/_/g, ' ')}</label>
              <input 
                required={field === 'resume_url'} 
                type={field === 'resume_url'? "url" : "text"} 
                value={field === 'resume_url' ? formData.resume_url : (formData.extra_fields[field] || '')} 
                onChange={e => {
                  if (field === 'resume_url') {
                    setFormData({...formData, resume_url: e.target.value});
                  } else {
                    setFormData({...formData, extra_fields: {...formData.extra_fields, [field]: e.target.value}});
                  }
                }} 
                className="w-full bg-transparent border border-border rounded-xl px-4 py-3 text-textMain focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-medium" 
              />
            </div>
          ))}
          
          {applyMutation.isError && (
             <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
               Error submitting application. Ensure internet connection and correct phone number format.
             </div>
          )}

          <button type="submit" disabled={applyMutation.isPending} className="w-full bg-primary hover:bg-blue-600 text-white px-4 py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 mt-4 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
