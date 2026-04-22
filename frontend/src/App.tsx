import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JobsList } from './pages/JobsList';
import { JobDashboard } from './pages/JobDashboard';
import { PublicApply } from './pages/PublicApply';
import { CandidateReview } from './pages/CandidateReview';
import { AdminLogin } from './pages/AdminLogin';
import { PublicJobsList } from './pages/PublicJobsList';
import { AuthGuard } from './components/AuthGuard';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-1/4 w-1/2 h-64 bg-primary/20 blur-[120px] mix-blend-screen pointer-events-none -z-10 rounded-full" />
          
          <nav className="border-b border-border glass-panel sticky top-0 z-50 rounded-none bg-background/80">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
              <Link to="/" className="font-bold text-2xl tracking-tight bg-clip-text text-transparent primary-gradient">
                Screen.AI
              </Link>
              <div className="flex items-center gap-4">
                <Link to="/admin/jobs" className="text-sm font-medium text-textMuted hover:text-white transition-colors">Admin Area</Link>
                <div className="text-sm font-medium text-textMuted bg-surface px-3 py-1 rounded-full border border-border">MVP System</div>
              </div>
            </div>
          </nav>

          <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
             <Routes>
               <Route path="/" element={<PublicJobsList />} />
               <Route path="/jobs" element={<PublicJobsList />} />
               <Route path="/apply/:job_id" element={<PublicApply />} />
               <Route path="/admin/login" element={<AdminLogin />} />
               <Route path="/admin/jobs" element={<AuthGuard><JobsList /></AuthGuard>} />
               <Route path="/admin/jobs/:id" element={<AuthGuard><JobDashboard /></AuthGuard>} />
               <Route path="/admin/candidate/:id" element={<AuthGuard><CandidateReview /></AuthGuard>} />
             </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>

  );
}

export default App;
