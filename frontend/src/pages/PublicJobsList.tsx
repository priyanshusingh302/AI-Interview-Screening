import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Link } from 'react-router-dom';
import { Clock, Briefcase, MapPin } from 'lucide-react';
import { format } from 'date-fns';

export function PublicJobsList() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['public-jobs'],
    queryFn: async () => {
      const res = await api.get('/jobs'); // Already filtered by status="open" in backend
      return res.data;
    }
  });

  return (
    <div className="space-y-8">
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent primary-gradient">
          Explore Opportunities
        </h1>
        <p className="text-xl text-textMuted max-w-2xl mx-auto">
          We're looking for passionate individuals to join our team. 
          Find a role that fits your ambition.
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-textMuted">Loading open positions...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs?.map((job: any) => (
            <div key={job._id} className="glass-panel p-6 hover:border-primary/50 transition-colors flex flex-col">
              <h3 className="text-xl font-semibold mb-1">{job.title}</h3>
              <p className="text-primary font-medium text-sm mb-4">{job.company_name}</p>
              <p className="text-textMuted text-sm mb-6 line-clamp-3 flex-1">{job.description}</p>
              
              <div className="mt-auto">
                <div className="flex flex-wrap items-center gap-2 text-xs text-textMuted mb-6">
                  <div className="flex items-center gap-1.5 bg-background py-1 px-2.5 rounded-full border border-border">
                    <MapPin size={14} /> {job.location} ({job.remote_type})
                  </div>
                  <div className="flex items-center gap-1.5 bg-background py-1 px-2.5 rounded-full border border-border">
                    <Briefcase size={14} /> {job.employment_type}
                  </div>
                  <div className="flex items-center gap-1.5 bg-background py-1 px-2.5 rounded-full border border-border">
                    <Clock size={14} /> {format(new Date(job.created_at), 'MMM d')}
                  </div>
                </div>

                <Link
                  to={`/apply/${job._id}`}
                  className="w-full inline-flex justify-center items-center py-2.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg font-medium transition-all"
                >
                  Apply Now
                </Link>
              </div>
            </div>
          ))}

          {jobs?.length === 0 && (
            <div className="col-span-full py-20 text-center text-textMuted glass-panel">
              <p className="text-lg">No open positions available at this time.</p>
              <p className="text-sm mt-2">Please check back later.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
