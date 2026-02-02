
export interface Prospect {
  id: string;
  name: string;
  email: string;
  business: string;
  role: string;
  website: string;
  pastNotes: string;
  researchSummary: string;
  generatedEmail?: string;
  insights?: {
    niche: string;
    mainOffer: string;
    authoritySignals: string[];
  };
  status: 'new' | 'researching' | 'writing' | 'completed' | 'error';
  createdAt: number;
}

export interface ResearchResult {
  summary: string;
  insights: {
    niche: string;
    mainOffer: string;
    authoritySignals: string[];
  };
}

export interface EmailResult {
  body: string;
}
