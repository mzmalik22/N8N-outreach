
import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Search, Mail, Loader2, Trash2, Send, ExternalLink, Briefcase, FileText, Info, Database, Settings, Activity } from 'lucide-react';
import { Prospect } from './types';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const [prospects, setProspects] = useState<Prospect[]>(() => {
    const saved = localStorage.getItem('outreach_pro_leads');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeProspectId, setActiveProspectId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showWorkflowInfo, setShowWorkflowInfo] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    business: '',
    role: '',
    website: '',
    pastNotes: ''
  });

  useEffect(() => {
    localStorage.setItem('outreach_pro_leads', JSON.stringify(prospects));
  }, [prospects]);

  const handleCreateProspect = (e: React.FormEvent) => {
    e.preventDefault();
    const newProspect: Prospect = {
      id: crypto.randomUUID(),
      ...formData,
      researchSummary: '',
      status: 'new',
      createdAt: Date.now()
    };
    setProspects(prev => [newProspect, ...prev]);
    setIsFormOpen(false);
    setFormData({ name: '', email: '', business: '', role: '', website: '', pastNotes: '' });
  };

  const handleResearch = async (id: string) => {
    setProspects(prev => prev.map(p => p.id === id ? { ...p, status: 'researching' } : p));
    const prospect = prospects.find(p => p.id === id);
    if (!prospect) return;

    try {
      const result = await geminiService.performResearch(prospect);
      setProspects(prev => prev.map(p => p.id === id ? { 
        ...p, 
        researchSummary: result.summary,
        insights: result.insights,
        status: 'new' 
      } : p));
    } catch (error) {
      console.error(error);
      setProspects(prev => prev.map(p => p.id === id ? { ...p, status: 'error' } : p));
    }
  };

  const handleGenerateEmail = async (id: string) => {
    setProspects(prev => prev.map(p => p.id === id ? { ...p, status: 'writing' } : p));
    const prospect = prospects.find(p => p.id === id);
    if (!prospect) return;

    try {
      const result = await geminiService.generateEmail(prospect);
      setProspects(prev => prev.map(p => p.id === id ? { 
        ...p, 
        generatedEmail: result.body,
        status: 'completed' 
      } : p));
    } catch (error) {
      console.error(error);
      setProspects(prev => prev.map(p => p.id === id ? { ...p, status: 'error' } : p));
    }
  };

  const deleteProspect = (id: string) => {
    setProspects(prev => prev.filter(p => p.id !== id));
    if (activeProspectId === id) setActiveProspectId(null);
  };

  const activeProspect = prospects.find(p => p.id === activeProspectId);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f0f2f5]">
      {/* Sidebar - Workflow Pipeline */}
      <div className="w-full md:w-80 border-r bg-white flex flex-col h-screen sticky top-0 shadow-sm z-20">
        <div className="p-6 border-b bg-slate-900 text-white">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Database size={20} className="text-blue-400" />
              n8n Outreach
            </h1>
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          </div>
          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Self-Hosted Workflow v2.4</p>
        </div>

        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Leads Pipeline</span>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search leads..." 
              className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border-none rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {prospects.map(p => (
            <div 
              key={p.id}
              onClick={() => setActiveProspectId(p.id)}
              className={`p-3 rounded-lg cursor-pointer transition-all border ${
                activeProspectId === p.id 
                ? 'bg-blue-50 border-blue-200 shadow-sm' 
                : 'hover:bg-slate-50 border-transparent'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <p className="font-semibold text-slate-900 text-sm truncate w-32">{p.name || 'Untitled'}</p>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-[10px] text-slate-500 truncate">{p.business || 'Pending Enrichment'}</p>
            </div>
          ))}
          {prospects.length === 0 && (
            <div className="text-center py-10">
              <p className="text-slate-400 text-xs">No active nodes in pipeline.</p>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t bg-slate-50">
          <button 
            onClick={() => setShowWorkflowInfo(!showWorkflowInfo)}
            className="w-full flex items-center justify-between p-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded transition-all"
          >
            <span className="flex items-center gap-2"><Settings size={14} /> Workflow Config</span>
            <Activity size={14} className={showWorkflowInfo ? 'text-blue-500' : 'text-slate-300'} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        {isFormOpen ? (
          <div className="max-w-2xl mx-auto w-full p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 font-display">New Prospect Input</h2>
              <p className="text-slate-500 text-sm mt-1">Simulate a new Google Sheets row trigger.</p>
            </div>
            <form onSubmit={handleCreateProspect} className="space-y-4 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Full Name</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-500 text-sm" placeholder="Jane Smith" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email</label>
                  <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-500 text-sm" placeholder="jane@example.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Business Name</label>
                  <input value={formData.business} onChange={e => setFormData({...formData, business: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-500 text-sm" placeholder="CourseLaunch Lab" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Website URL</label>
                  <input value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-500 text-sm" placeholder="courselaunchlab.com" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Internal Notes (From CRM)</label>
                <textarea rows={3} value={formData.pastNotes} onChange={e => setFormData({...formData, pastNotes: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-500 text-sm" placeholder="Previous appearances, specific focus areas..." />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 py-2.5 bg-slate-900 text-white rounded font-bold hover:bg-slate-800 transition-all shadow-md text-sm">Add to Pipeline</button>
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded font-bold hover:bg-slate-200 text-sm">Cancel</button>
              </div>
            </form>
          </div>
        ) : activeProspect ? (
          <div className="max-w-5xl mx-auto w-full p-6 md:p-10 space-y-6">
            {/* Lead Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xl">
                  {activeProspect.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{activeProspect.name}</h2>
                  <div className="flex items-center gap-3 text-slate-500 text-xs mt-0.5 font-mono">
                    <span className="flex items-center gap-1"><Briefcase size={12}/> {activeProspect.business}</span>
                    <span className="flex items-center gap-1 opacity-50">•</span>
                    <span className="flex items-center gap-1"><Mail size={12}/> {activeProspect.email || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {activeProspect.website && (
                  <a href={activeProspect.website.startsWith('http') ? activeProspect.website : `https://${activeProspect.website}`} target="_blank" className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded border border-slate-100"><ExternalLink size={16}/></a>
                )}
                <button 
                  onClick={() => deleteProspect(activeProspect.id)}
                  className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded border border-slate-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Research & Data Enrichment */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b bg-slate-50 flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Activity size={14} className="text-blue-500" /> Web Research Synthesis
                    </h3>
                    {!activeProspect.insights && activeProspect.status !== 'researching' && (
                      <button 
                        onClick={() => handleResearch(activeProspect.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700 transition-all uppercase tracking-tighter"
                      >
                        Enrich with Serper
                      </button>
                    )}
                  </div>
                  <div className="p-6">
                    {activeProspect.status === 'researching' ? (
                      <div className="py-10 flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="animate-spin text-blue-500" size={24} />
                        <p className="text-xs font-mono text-slate-400">Triggering Serper Enrichment Node...</p>
                      </div>
                    ) : activeProspect.insights ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 rounded border border-slate-100">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Niche Analysis</label>
                            <p className="text-sm font-semibold text-slate-800">{activeProspect.insights.niche}</p>
                          </div>
                          <div className="p-4 bg-slate-50 rounded border border-slate-100">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Core Product/Offer</label>
                            <p className="text-sm font-semibold text-slate-800">{activeProspect.insights.mainOffer}</p>
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Authority Signals</label>
                          <div className="flex flex-wrap gap-2">
                            {activeProspect.insights.authoritySignals.map((sig, i) => (
                              <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold rounded">
                                {sig}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="pt-4 border-t border-slate-100">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Workflow Summary</label>
                          <p className="text-sm text-slate-600 leading-relaxed font-serif italic">{activeProspect.researchSummary}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-10 text-center">
                        <p className="text-slate-400 text-xs font-mono">Awaiting enrichment from n8n Serper node.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Email Output */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b bg-slate-50 flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Mail size={14} className="text-indigo-500" /> Copywriting Agent Output
                    </h3>
                    {activeProspect.insights && activeProspect.status !== 'writing' && (
                      <button 
                        onClick={() => handleGenerateEmail(activeProspect.id)}
                        className="px-3 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold hover:bg-indigo-700 transition-all uppercase tracking-tighter"
                      >
                        {activeProspect.generatedEmail ? 'Regenerate Draft' : 'Draft Outreach'}
                      </button>
                    )}
                  </div>
                  <div className="p-6">
                    {activeProspect.status === 'writing' ? (
                      <div className="py-10 flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="animate-spin text-indigo-500" size={24} />
                        <p className="text-xs font-mono text-slate-400">Agent Processing: Research Synthesis + Write...</p>
                      </div>
                    ) : activeProspect.generatedEmail ? (
                      <div className="space-y-4">
                        <div className="p-6 bg-slate-900 border border-slate-800 rounded shadow-inner font-mono text-sm text-blue-50/90 leading-relaxed whitespace-pre-wrap">
                          {activeProspect.generatedEmail}
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono italic">
                          <span>Word Count: {activeProspect.generatedEmail.split(/\s+/).length} | Tone: Founder-to-Founder</span>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(activeProspect.generatedEmail || '');
                                alert('Copied to clipboard');
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded uppercase tracking-tighter"
                            >
                              Copy
                            </button>
                            <a 
                              href={`mailto:${activeProspect.email}?subject=Invitation: The Art of Selling Online Courses&body=${encodeURIComponent(activeProspect.generatedEmail)}`}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded uppercase tracking-tighter flex items-center gap-2"
                            >
                              <Send size={12} /> Send via Gmail
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-10 text-center text-slate-400 text-xs font-mono">
                        {activeProspect.insights 
                          ? "Insights extracted. Ready for AI Agent draft node."
                          : "Research enrichment required to unlock copywriting agent."
                        }
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Workflow Context */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Internal CRM Data</h4>
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded text-xs text-amber-800">
                      <label className="text-[9px] font-black text-amber-400 uppercase tracking-widest block mb-1">Source Notes</label>
                      <p className="leading-relaxed">"{activeProspect.pastNotes || 'No notes found in Sheets record.'}"</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-slate-200"></span>
                      Added on: {new Date(activeProspect.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="bg-[#1e1e1e] p-5 rounded-xl text-white shadow-sm font-mono text-[11px] overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Activity size={60} />
                  </div>
                  <h4 className="text-blue-400 mb-3 border-b border-white/10 pb-2">WORKFLOW_LOGS</h4>
                  <div className="space-y-1 opacity-70">
                    <p className="text-green-400">[info] Trigger: Google Sheets node resolved.</p>
                    <p>[info] Extraction: {activeProspect.name} identified.</p>
                    {activeProspect.status === 'researching' && <p className="text-blue-400 animate-pulse">[exec] Serper enrichment in progress...</p>}
                    {activeProspect.insights && <p className="text-green-400">[done] Insights cached to status column.</p>}
                    {activeProspect.status === 'writing' && <p className="text-indigo-400 animate-pulse">[exec] Copywriting agent node running...</p>}
                    {activeProspect.generatedEmail && <p className="text-green-400">[done] Email draft ready for SMTP send.</p>}
                    {activeProspect.status === 'error' && <p className="text-red-400">[fail] Node execution failed. Check API key.</p>}
                    <p className="text-slate-500 underline mt-4 cursor-pointer hover:text-white transition-all">View Full Execution History</p>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-blue-50 border border-blue-100 flex gap-4">
                  <div className="text-blue-600 mt-1"><Info size={18} /></div>
                  <div>
                    <h5 className="font-bold text-blue-900 text-sm">Agent Guidelines</h5>
                    <p className="text-xs text-blue-700/80 leading-relaxed mt-1">
                      The agent is instructed to focus on the <strong>Founder-to-Founder</strong> tone. It avoids generic compliments to maximize conversion rates on the podcast invitation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="max-w-md space-y-6">
              <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mx-auto shadow-sm rotate-3">
                <Activity size={32} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 font-display">Workflow Dashboard</h2>
                <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                  Manage the automated outreach pipeline for "The Art of Selling Online Courses." Select or add a lead to trigger research enrichment.
                </p>
              </div>
              <button 
                onClick={() => setIsFormOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded font-bold hover:bg-slate-800 shadow-md transition-all text-sm uppercase tracking-tighter"
              >
                <Plus size={18} /> Import Single Lead
              </button>
            </div>
          </div>
        )}
      </div>

      {showWorkflowInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl relative">
            <button onClick={() => setShowWorkflowInfo(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl">×</button>
            <h3 className="text-xl font-bold mb-4 font-display flex items-center gap-2">
              <Settings className="text-blue-500" /> n8n Integration Settings
            </h3>
            <div className="space-y-4 font-mono text-[11px] bg-slate-50 p-4 rounded border">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">TRIGGER_MODE</span>
                <span className="text-green-600 font-bold">BATCH_DAILY</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">ENRICHMENT_TOOL</span>
                <span className="text-slate-800 font-bold">SERPER_API_V1</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">LLM_ENGINE</span>
                <span className="text-indigo-600 font-bold">GEMINI_3_PRO</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">SENDER_CONTEXT</span>
                <span className="text-slate-800 font-bold">ArtOfSellingPodcast@agency.io</span>
              </div>
              <div className="pt-2 text-slate-400 leading-relaxed">
                # This dashboard provides a UI for manual intervention when nodes fail or high-value prospects need oversight.
              </div>
            </div>
            <button 
              onClick={() => setShowWorkflowInfo(false)}
              className="mt-6 w-full py-3 bg-slate-900 text-white rounded font-bold"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusBadge: React.FC<{ status: Prospect['status'] }> = ({ status }) => {
  const configs = {
    new: { color: 'bg-slate-100 text-slate-600', text: 'New Row' },
    researching: { color: 'bg-blue-100 text-blue-600 animate-pulse', text: 'Serper_Node' },
    writing: { color: 'bg-indigo-100 text-indigo-600 animate-pulse', text: 'Agent_Node' },
    completed: { color: 'bg-green-100 text-green-600', text: 'Ready' },
    error: { color: 'bg-red-100 text-red-600', text: 'Failed' }
  };

  const config = configs[status];
  return (
    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest font-mono ${config.color}`}>
      {config.text}
    </span>
  );
};

export default App;
