import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Upload, MessageCircle, FileText, Zap, Menu, X, CheckCircle, ArrowRight, Star, Sparkles, Shield, Clock, Download, RefreshCcw, PenTool, Users, ArrowLeft, History, Check, AlertTriangle, ScrollText } from 'lucide-react';
import './App.css';
import { insertOnboarding, insertDocumentSummary, insertQuestionAnswer, insertClauseVersion, fetchClauseVersions, supabase } from './supabaseClient';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Navigation Component
function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="glass-card z-50 rounded-none border-0 border-b border-glow backdrop-blur-strong">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-4 group">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 via-purple-600 to-cyan-500 rounded-2xl flex items-center justify-center animate-pulse-glow group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-black text-gradient-accent tracking-tight">Corpus AI</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-10">
            <Link 
              to="/"
              className={`text-lg font-semibold transition-all duration-300 hover:scale-105 ${
                location.pathname === '/'
                  ? 'text-blue-400 text-glow'
                  : 'text-gray-300 hover:text-white hover:text-glow'
              }`}
            >
              Home
            </Link>
            <Link 
              to="/negotiation"
              className={`text-lg font-semibold transition-all duration-300 hover:scale-105 ${
                location.pathname === '/negotiation'
                  ? 'text-blue-400 text-glow'
                  : 'text-gray-300 hover:text-white hover:text-glow'
              }`}
            >
              Negotiation Sandbox
            </Link>
            <Link 
              to="/pricing"
              className={`text-lg font-semibold transition-all duration-300 hover:scale-105 ${
                location.pathname === '/pricing'
                  ? 'text-blue-400 text-glow'
                  : 'text-gray-300 hover:text-white hover:text-glow'
              }`}
            >
              Pricing
            </Link>
            <button className="btn-primary animate-shimmer flex items-center space-x-2">
              <Sparkles className="w-5 h-5" />
              <span>Get Started</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-400 hover:text-white transition-all duration-300 hover:scale-110 p-2"
            >
              {isMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden animate-fade-in-up">
            <div className="px-2 pt-2 pb-6 space-y-3 glass-card mt-4 mx-4 mb-4">
              <Link
                to="/"
                className="block px-4 py-3 text-lg font-semibold text-gray-300 hover:text-white hover:bg-gray-800/30 rounded-xl transition-all duration-300"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/negotiation"
                className="block px-4 py-3 text-lg font-semibold text-gray-300 hover:text-white hover:bg-gray-800/30 rounded-xl transition-all duration-300"
                onClick={() => setIsMenuOpen(false)}
              >
                Negotiation Sandbox
              </Link>
              
              <button className="w-full btn-primary mt-4 flex items-center justify-center space-x-2">
                <Sparkles className="w-5 h-5" />
                <span>Get Started</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

// Main App Component
function MainApp() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [contractId, setContractId] = useState(null);
  const [contractInfo, setContractInfo] = useState(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(false);
  const [clientUserId, setClientUserId] = useState('');
  const [onboarded, setOnboarded] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [profession, setProfession] = useState('');
  const [qaHistory, setQaHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [lastAnsweredQuestion, setLastAnsweredQuestion] = useState('');

  useEffect(() => {
    const existingId = localStorage.getItem('client_user_id');
    const isOnboarded = localStorage.getItem('onboarded') === 'true';
    if (existingId) {
      setClientUserId(existingId);
    } else {
      const newId = crypto.randomUUID();
      localStorage.setItem('client_user_id', newId);
      setClientUserId(newId);
    }
    setOnboarded(isOnboarded);
  }, []);

  useEffect(() => {
    const storedMeta = localStorage.getItem('active_contract_meta');
    if (storedMeta) {
      try {
        const parsed = JSON.parse(storedMeta);
        if (parsed?.contractId && !contractId) {
          setContractId(parsed.contractId);
        }
        if (parsed && !contractInfo) {
          setContractInfo({
            contract_id: parsed.contractId,
            filename: parsed.filename,
            pages: parsed.pages,
            chunks: parsed.chunks,
          });
        }
      } catch (err) {
        console.warn('Failed to parse stored contract metadata', err);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load Q&A history for this client user
  useEffect(() => {
    async function fetchHistory() {
      if (!clientUserId || !onboarded) return;
      const { data, error: supaErr } = await supabase
        .from('qa')
        .select('*')
        .eq('client_user_id', clientUserId)
        .order('created_at', { ascending: false });
      if (!supaErr && data) setQaHistory(data);
    }
    fetchHistory();
  }, [clientUserId, onboarded]);

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !age || !profession) {
      setError('Please fill in all onboarding fields.');
      return;
    }
    setError('');
    try {
      await insertOnboarding({ clientUserId, name: name.trim(), age: Number(age), profession });
      localStorage.setItem('onboarded', 'true');
      setOnboarded(true);
    } catch (err) {
      setError('Failed to save onboarding. Please try again.');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a PDF file only.');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size should be less than 10MB.');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('onboarded');
      localStorage.removeItem('client_user_id');
      localStorage.removeItem('active_contract_meta');
      if (contractId) {
        localStorage.removeItem(`active_contract_edits_${contractId}`);
      }
    } catch (_) {}
    setOnboarded(false);
    setClientUserId('');
    setFile(null);
    setContractId(null);
    setContractInfo(null);
    setQuestion('');
    setAnswer('');
    setLastAnsweredQuestion('');
    setQaHistory([]);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a PDF file first.');
      return;
    }

    setUploadProgress(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setContractId(response.data.contract_id);
      setContractInfo(response.data);
      setError('');

      try {
        localStorage.setItem(
          'active_contract_meta',
          JSON.stringify({
            contractId: response.data.contract_id,
            filename: response.data.filename,
            pages: response.data.pages,
            chunks: response.data.chunks,
            uploadedAt: new Date().toISOString(),
          })
        );
      } catch (_) {
        // Non-fatal
      }

      // Store document summary in Supabase
      try {
        await insertDocumentSummary({
          clientUserId,
          title: response.data.filename,
          pages: response.data.pages,
          chunks: response.data.chunks,
          contractId: response.data.contract_id
        });
      } catch (_) {
        // Non-fatal; continue silently
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setUploadProgress(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      setError('Please enter a question.');
      return;
    }
    
    if (!contractId) {
      setError('Please upload a contract first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/ask`, {
        question: question,
        contract_id: contractId
      });
      
      setAnswer(response.data.answer);
      setError('');
      setLastAnsweredQuestion(question.trim());

      // Store Q&A in Supabase
      try {
        await insertQuestionAnswer({
          clientUserId,
          contractId,
          question: question.trim(),
          answer: response.data.answer
        });
        // Optimistically update history
        setQaHistory((prev) => [
          {
            id: `local-${Date.now()}`,
            client_user_id: clientUserId,
            contract_id: contractId,
            question: question.trim(),
            answer: response.data.answer,
            created_at: new Date().toISOString()
          },
          ...prev
        ]);
      } catch (_) {
        // Non-fatal
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to get answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAnswer = () => {
    if (!answer) return;
    const baseName = (contractInfo?.filename || 'contract')
      .replace(/\.[^/.]+$/, '')
      .replace(/\s+/g, '_')
      .toLowerCase();
    const payload = [
      `Contract: ${contractInfo?.filename || 'Unknown Contract'}`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      `Question:`,
      `${(lastAnsweredQuestion || question || '').trim() || 'N/A'}`,
      '',
      'Answer:',
      answer,
    ].join('\n');

    const blob = new Blob([payload], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}-analysis.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!onboarded) {
    return (
      <div className="min-h-screen bg-cosmic">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="glass-card p-10 animate-fade-in-up">
            <h2 className="text-4xl font-black text-gradient-primary mb-8 text-center">Welcome! Tell us about you</h2>
            <form onSubmit={handleOnboardingSubmit} className="space-y-8">
              <div className="space-y-2">
                <label className="block text-gray-300 font-semibold text-lg">What’s your name?</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Pranjal Kaushik"
                  className="w-full bg-gray-800/60 border border-gray-600 rounded-2xl px-6 py-4 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:border-glow"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-gray-300 font-semibold text-lg">How old are you?</label>
                <input
                  type="number"
                  min="1"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g., 20"
                  className="w-full bg-gray-800/60 border border-gray-600 rounded-2xl px-6 py-4 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:border-glow"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-gray-300 font-semibold text-lg">What best describes you?</label>
                <select
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className="w-full bg-gray-800/60 border border-gray-600 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500 focus:border-glow"
                >
                  <option value="" disabled>Select profession</option>
                  <option value="lawyer">Lawyer</option>
                  <option value="student">Student</option>
                  <option value="in-house">In-house Counsel</option>
                  <option value="paralegal">Paralegal</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button type="submit" className="w-full btn-primary text-xl py-5">Continue</button>
            </form>
            {error && (
              <div className="mt-6 error">
                <div className="font-bold">{error}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cosmic">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center animate-fade-in-up">
            <h1 className="text-6xl md:text-8xl font-black text-white mb-12 animate-float leading-tight">
              Legal AI Assistant for
              <span className="text-gradient-accent block mt-4">India</span>
            </h1>
            <p className="text-2xl text-gray-300 mb-16 max-w-5xl mx-auto leading-relaxed font-medium">
              Upload your legal contracts and get instant, intelligent answers to your questions. 
              Powered by advanced AI technology designed for Indian legal professionals.
            </p>
            
            {/* Feature Pills */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <div className="glass-card px-6 py-3 flex items-center space-x-3">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="text-gray-300 font-medium">Secure & Private</span>
              </div>
              <div className="glass-card px-6 py-3 flex items-center space-x-3">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="text-gray-300 font-medium">Instant Analysis</span>
              </div>
              <div className="glass-card px-6 py-3 flex items-center space-x-3">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span className="text-gray-300 font-medium">AI Powered</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interface */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Upload Section */}
          <div className="glass-card card-hover p-10 animate-scale-in">
            <div className="flex items-center mb-10">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mr-6 animate-pulse-glow">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-4xl font-black text-gradient-primary">Upload Contract</h2>
            </div>
            
            <div className="space-y-8">
              <div className="border-2 border-dashed border-gray-600 rounded-2xl p-12 text-center hover:border-blue-400 hover:border-glow transition-all duration-300 backdrop-blur-strong file-upload-area">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="animate-float">
                    <FileText className="w-20 h-20 text-gray-400 mx-auto mb-6" />
                  </div>
                  <div className="text-white font-bold text-xl mb-3">
                    {file ? file.name : 'Choose PDF file'}
                  </div>
                  <div className="text-gray-400 text-lg">
                    Upload legal contracts up to 10MB
                  </div>
                </label>
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || uploadProgress}
                className="w-full btn-primary text-xl py-5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadProgress ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-white mr-4"></div>
                    Processing Contract...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Upload className="w-6 h-6 mr-4" />
                    Upload & Process
                  </div>
                )}
              </button>

              {contractInfo && (
                <div className="success animate-fade-in-up">
                  <div className="flex items-center text-green-400 mb-4">
                    <CheckCircle className="w-7 h-7 mr-4" />
                    <span className="font-bold text-lg">Contract Processed Successfully</span>
                  </div>
                  <div className="text-gray-300 space-y-3 text-lg">
                    <div className="flex justify-between">
                      <span className="font-medium">File:</span>
                      <span className="font-bold">{contractInfo.filename}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Pages:</span>
                      <span className="font-bold">{contractInfo.pages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Chunks:</span>
                      <span className="font-bold">{contractInfo.chunks}</span>
                    </div>
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={() => navigate('/negotiation')}
                      className="w-full btn-ghost border border-blue-500/40 text-blue-300 hover:border-blue-400 hover:text-white py-4 rounded-2xl flex items-center justify-center space-x-3 transition-all duration-300"
                    >
                      <PenTool className="w-5 h-5" />
                      <span>Open Negotiation Sandbox</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Question Section */}
          <div className="glass-card card-hover p-10 animate-slide-in-right">
            <div className="flex items-center mb-10">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mr-6 animate-pulse-glow">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-4xl font-black text-gradient-primary">Ask Question</h2>
            </div>

            <div className="space-y-8">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What are the termination clauses in this contract?"
                className="w-full h-48 bg-gray-800/60 border border-gray-600 rounded-2xl px-8 py-6 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:border-glow transition-all duration-300 resize-none backdrop-blur-strong text-lg font-medium"
                disabled={!contractId}
              />

              <button
                onClick={handleAskQuestion}
                disabled={!contractId || !question.trim() || loading}
                className="w-full btn-primary text-xl py-5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-white mr-4"></div>
                    Analyzing Contract...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 mr-4" />
                    Get AI Analysis
                  </div>
                )}
              </button>

              {!contractId && (
                <div className="text-center p-8 glass-card">
                  <p className="text-gray-400 text-xl font-medium">
                    📄 Upload a contract first to unlock AI-powered analysis
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-12 error animate-fade-in-up">
            <div className="font-bold text-xl">⚠️ {error}</div>
          </div>
        )}

        {/* Answer Display */}
        {answer && (
          <div className="mt-12 glass-card p-10 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
              <h3 className="text-3xl font-black text-white flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mr-6 animate-pulse-glow">
                  <Star className="w-7 h-7 text-white" />
                </div>
                AI Legal Analysis
              </h3>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleDownloadAnswer}
                  className="btn-ghost border border-gray-700 hover:border-blue-400 hover:text-white px-6 py-3 rounded-2xl flex items-center space-x-3 transition-all duration-300"
                >
                  <Download className="w-5 h-5" />
                  <span>Download Answer</span>
                </button>
                <button
                  onClick={() => navigate('/negotiation')}
                  className="btn-primary px-6 py-3 rounded-2xl flex items-center space-x-3 transition-all duration-300"
                >
                  <PenTool className="w-5 h-5" />
                  <span>Negotiate Clauses</span>
                </button>
              </div>
            </div>
            <div className="glass-card mb-8 p-6 border border-gray-700/60">
              <div className="text-sm uppercase tracking-wide text-gray-400 mb-2">Latest Question</div>
              <div className="text-lg text-white font-medium leading-relaxed">
                {lastAnsweredQuestion || question}
              </div>
            </div>
            <div className="content-wrapper prose prose-invert max-w-none text-xl leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
      {/* History Toggle Button */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="fixed right-6 bottom-6 z-40 btn-primary px-5 py-4 rounded-2xl shadow-lg"
      >
        {showHistory ? 'Close History' : 'Show History'}
      </button>
      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="fixed left-6 bottom-6 z-40 btn-ghost px-5 py-4 rounded-2xl shadow-lg"
      >
        Log out
      </button>
      {/* History Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[28rem] bg-gray-900/95 backdrop-blur-strong border-l border-glow z-30 transform transition-transform duration-300 ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-700 flex items-center justify-between">
            <h4 className="text-2xl font-black text-gradient-primary">Your Q&A History</h4>
            <button onClick={() => setShowHistory(false)} className="btn-ghost px-4 py-2">Close</button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {qaHistory.length === 0 ? (
              <div className="text-gray-400">No history yet.</div>
            ) : (
              qaHistory.map((item) => (
                <div key={item.id} className="glass-card p-5">
                  <div className="text-sm text-gray-400 mb-2">{new Date(item.created_at).toLocaleString()}</div>
                  <div className="mb-3">
                    <div className="text-gray-300 font-semibold mb-1">Question</div>
                    <div className="text-white">{item.question}</div>
                  </div>
                  <div>
                    <div className="text-gray-300 font-semibold mb-1">Answer</div>
                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.answer || ''}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NegotiationSandbox() {
  const navigate = useNavigate();
  const [contractMeta] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('active_contract_meta') || 'null');
    } catch (err) {
      console.warn('Failed to parse contract meta', err);
      return null;
    }
  });
  const [clientUserId] = useState(() => localStorage.getItem('client_user_id') || '');
  const contractId = contractMeta?.contractId || '';

  const [clauses, setClauses] = useState([]);
  const [clausesLoading, setClausesLoading] = useState(false);
  const [selectedClauseIndex, setSelectedClauseIndex] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [guidanceSummary, setGuidanceSummary] = useState('');
  const [playbookGuidance, setPlaybookGuidance] = useState('');
  const [negotiationGoal, setNegotiationGoal] = useState('');
  const [tone, setTone] = useState('');
  const [counterpartyPosition, setCounterpartyPosition] = useState('');
  const [notes, setNotes] = useState('');
  const [counterpartyStatus, setCounterpartyStatus] = useState('pending');
  const [counterpartyFeedback, setCounterpartyFeedback] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editedClauses, setEditedClauses] = useState({});
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const compiledFilename = useMemo(() => {
    const raw = contractMeta?.filename || 'contract-draft';
    const base = raw.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_').toLowerCase();
    return base || 'contract-draft';
  }, [contractMeta]);

  const refreshHistory = useCallback(
    async (clauseIdx = selectedClauseIndex, showSpinner = true) => {
      if (
        !clientUserId ||
        !contractId ||
        clauseIdx === null ||
        clauseIdx === undefined
      ) {
        return;
      }
      if (showSpinner) {
        setHistoryLoading(true);
      }
      try {
        const data = await fetchClauseVersions({
          clientUserId,
          contractId,
          clauseIndex: clauseIdx,
        });
        setHistory(data || []);
      } catch (err) {
        console.warn('Failed to load clause history', err);
      } finally {
        if (showSpinner) {
          setHistoryLoading(false);
        }
      }
    },
    [clientUserId, contractId, selectedClauseIndex]
  );

  useEffect(() => {
    if (!contractId) return;
    try {
      const stored = localStorage.getItem(`active_contract_edits_${contractId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setEditedClauses(parsed || {});
      }
    } catch (err) {
      console.warn('Failed to load stored clause edits', err);
    }
  }, [contractId]);

  useEffect(() => {
    if (!contractId) return;
    try {
      localStorage.setItem(
        `active_contract_edits_${contractId}`,
        JSON.stringify(editedClauses || {})
      );
    } catch (err) {
      console.warn('Failed to persist clause edits', err);
    }
  }, [contractId, editedClauses]);

  useEffect(() => {
    if (!contractId) return;
    const loadClauses = async () => {
      setClausesLoading(true);
      setError('');
      try {
        const response = await axios.get(`${API_BASE_URL}/api/contracts/${contractId}/clauses`);
        setClauses(response.data?.clauses || []);
        if (response.data?.clauses?.length && selectedClauseIndex === null) {
          setSelectedClauseIndex(0);
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load contract clauses.');
        setClauses([]);
      } finally {
        setClausesLoading(false);
      }
    };
    loadClauses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  useEffect(() => {
    if (!clientUserId || !contractId || selectedClauseIndex === null) {
      setHistory([]);
      setHistoryLoading(false);
      return;
    }
    refreshHistory(selectedClauseIndex, true);
  }, [clientUserId, contractId, selectedClauseIndex, refreshHistory]);

  useEffect(() => {
    if (selectedClauseIndex === null) {
      setAiSuggestion('');
      setGuidanceSummary('');
      return;
    }
    const existing = editedClauses?.[selectedClauseIndex];
    if (existing?.finalText) {
      setAiSuggestion(existing.finalText);
      setGuidanceSummary(existing.guidance || '');
    } else {
      setAiSuggestion('');
      setGuidanceSummary('');
    }
    setNotes('');
    setCounterpartyFeedback('');
    setStatusMessage('');
  }, [editedClauses, selectedClauseIndex]);

  const handleRequestSuggestion = async () => {
    if (selectedClauseIndex === null) {
      setError('Select a clause before requesting an alternative.');
      return;
    }
    setSuggestionLoading(true);
    setError('');
    setStatusMessage('');
    try {
      const payload = {
        playbook: playbookGuidance || null,
        negotiation_goal: negotiationGoal || null,
        tone: tone || null,
        counterparty_position: counterpartyPosition || null,
      };
      const response = await axios.post(
        `${API_BASE_URL}/api/contracts/${contractId}/clauses/${selectedClauseIndex}/suggest`,
        payload
      );
      setAiSuggestion(response.data.ai_suggestion || '');
      setGuidanceSummary(response.data.guidance_summary || '');
      setStatusMessage('AI drafted a new alternative clause.');
      if (clientUserId) {
        try {
          await insertClauseVersion({
            clientUserId,
            contractId,
            clauseIndex: selectedClauseIndex,
            originalText: clauses[selectedClauseIndex]?.text || '',
            aiSuggestion: response.data.ai_suggestion || '',
            finalText: response.data.ai_suggestion || '',
            status: 'suggested',
            notes: negotiationGoal || playbookGuidance || '',
            counterpartyFeedback: null,
          });
          await refreshHistory(selectedClauseIndex, false);
        } catch (err) {
          console.warn('Failed to log suggestion in Supabase', err);
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate clause alternative.');
    } finally {
      setSuggestionLoading(false);
    }
  };

  const handleAcceptSuggestion = async () => {
    if (selectedClauseIndex === null) {
      setError('Select a clause before accepting.');
      return;
    }
    const finalText = (aiSuggestion || '').trim();
    if (!finalText) {
      setError('Generate or draft an alternative clause before accepting.');
      return;
    }

    const nextState = {
      ...editedClauses,
      [selectedClauseIndex]: {
        finalText,
        guidance: guidanceSummary,
        lastUpdated: new Date().toISOString(),
      },
    };
    setEditedClauses(nextState);
    setStatusMessage('Clause accepted into the working draft.');

    if (clientUserId) {
      try {
        await insertClauseVersion({
          clientUserId,
          contractId,
          clauseIndex: selectedClauseIndex,
          originalText: clauses[selectedClauseIndex]?.text || '',
          aiSuggestion,
          finalText,
          status: 'accepted',
          notes: notes || '',
          counterpartyFeedback: null,
        });
        setNotes('');
        await refreshHistory(selectedClauseIndex, false);
      } catch (err) {
        console.warn('Failed to record acceptance', err);
      }
    }
  };

  const handleResetClause = async () => {
    if (selectedClauseIndex === null) return;
    const nextState = { ...editedClauses };
    delete nextState[selectedClauseIndex];
    setEditedClauses(nextState);
    setAiSuggestion('');
    setGuidanceSummary('');
    setStatusMessage('Clause reverted to original language.');

    if (clientUserId) {
      try {
        await insertClauseVersion({
          clientUserId,
          contractId,
          clauseIndex: selectedClauseIndex,
          originalText: clauses[selectedClauseIndex]?.text || '',
          aiSuggestion: null,
          finalText: clauses[selectedClauseIndex]?.text || '',
          status: 'reverted',
          notes: 'Reverted to original clause',
          counterpartyFeedback: null,
        });
        await refreshHistory(selectedClauseIndex, false);
      } catch (err) {
        console.warn('Failed to log revert', err);
      }
    }
  };

  const handleLogCounterpartyResponse = async () => {
    if (selectedClauseIndex === null) {
      setError('Select a clause before logging counterparty feedback.');
      return;
    }
    if (!clientUserId) {
      setError('Client identifier missing. Refresh and retry.');
      return;
    }
    try {
      await insertClauseVersion({
        clientUserId,
        contractId,
        clauseIndex: selectedClauseIndex,
        originalText: clauses[selectedClauseIndex]?.text || '',
        aiSuggestion,
        finalText:
          editedClauses[selectedClauseIndex]?.finalText ||
          aiSuggestion ||
          clauses[selectedClauseIndex]?.text ||
          '',
        status: `counterparty_${counterpartyStatus}`,
        notes: notes || '',
        counterpartyFeedback: counterpartyFeedback || '',
      });
      setCounterpartyFeedback('');
      setStatusMessage('Counterparty response captured.');
      await refreshHistory(selectedClauseIndex, false);
    } catch (err) {
      setError('Failed to log counterparty response. Please retry.');
    }
  };

  const handleDownloadEditedContract = () => {
    if (!clauses.length) {
      setError('No clauses available to download.');
      return;
    }

    const compiled = clauses
      .map((clause) => {
        const override = editedClauses[clause.index];
        return (override?.finalText || clause.text || '').trim();
      })
      .join('\n\n');

    const blob = new Blob([compiled], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${compiledFilename}-working-draft.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusMessage('Downloaded the latest working draft.');
  };

  const handleRefreshClauses = async () => {
    if (!contractId) return;
    setClausesLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/contracts/${contractId}/clauses`);
      setClauses(response.data?.clauses || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to refresh clauses.');
    } finally {
      setClausesLoading(false);
    }
  };

  if (!contractId) {
    return (
      <div className="min-h-screen bg-cosmic flex items-center justify-center px-6">
        <div className="glass-card max-w-2xl p-12 text-center space-y-8">
          <h2 className="text-4xl font-black text-white">No Active Contract</h2>
          <p className="text-gray-300 text-lg leading-relaxed">
            Upload a contract from the Home tab to unlock the negotiation sandbox. The workspace
            will automatically load the document, break it into clauses, and let you capture every
            redline, counter, and acceptance.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary px-8 py-4 rounded-2xl text-lg font-semibold flex items-center justify-center space-x-3 mx-auto"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Upload Contract</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cosmic">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => navigate('/')}
            className="btn-ghost px-5 py-3 rounded-2xl flex items-center space-x-3 border border-gray-700 hover:border-blue-400"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Analysis</span>
          </button>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRefreshClauses}
              className="btn-ghost px-5 py-3 rounded-2xl flex items-center space-x-3 border border-gray-700 hover:border-blue-400"
            >
              <RefreshCcw className={`w-5 h-5 ${clausesLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Clauses</span>
            </button>
            <button
              onClick={handleDownloadEditedContract}
              className="btn-primary px-5 py-3 rounded-2xl flex items-center space-x-3"
            >
              <Download className="w-5 h-5" />
              <span>Download Working Draft</span>
            </button>
          </div>
        </div>

        <div className="glass-card p-8 space-y-2">
          <div className="text-sm uppercase tracking-[0.3em] text-gray-400">Active Contract</div>
          <div className="text-3xl font-black text-white">{contractMeta?.filename}</div>
          <div className="text-gray-400 flex flex-wrap gap-6 text-sm mt-2">
            <span>{contractMeta?.pages ?? '—'} pages</span>
            <span>{clauses.length} clauses detected</span>
            <span>Contract ID: {contractId.slice(0, 8)}…</span>
          </div>
        </div>

        {(error || statusMessage) && (
          <div className="space-y-4">
            {error && (
              <div className="error glass-card border border-red-500/40 text-red-200 px-6 py-4 flex items-center space-x-4">
                <AlertTriangle className="w-6 h-6" />
                <span className="font-semibold">{error}</span>
              </div>
            )}
            {statusMessage && (
              <div className="glass-card border border-green-500/30 text-green-200 px-6 py-4 flex items-center space-x-4">
                <Check className="w-6 h-6" />
                <span className="font-semibold">{statusMessage}</span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[22rem_1fr] gap-10">
          <div className="glass-card p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-white flex items-center space-x-3">
                <ScrollText className="w-5 h-5 text-blue-400" />
                <span>Contract Clauses</span>
              </h3>
              <span className="text-sm text-gray-400">{clauses.length} total</span>
            </div>
            {clausesLoading ? (
              <div className="text-gray-400 text-center py-10">Loading clauses…</div>
            ) : clauses.length === 0 ? (
              <div className="text-gray-400 text-center py-10">
                No clauses detected. Try re-uploading the contract.
              </div>
            ) : (
              clauses.map((clause) => {
                const isActive = clause.index === selectedClauseIndex;
                const clauseMeta = editedClauses[clause.index];
                return (
                  <button
                    key={clause.index}
                    onClick={() => setSelectedClauseIndex(clause.index)}
                    className={`w-full text-left p-4 rounded-2xl transition-all duration-300 border ${
                      isActive
                        ? 'border-blue-500/60 bg-blue-500/10'
                        : 'border-transparent hover:border-gray-700 hover:bg-gray-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-blue-300">
                        Clause {clause.index + 1}
                      </div>
                      {clauseMeta?.finalText && (
                        <span className="text-xs uppercase tracking-wide text-green-300 bg-green-500/10 px-3 py-1 rounded-xl">
                          Drafted
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-300 leading-relaxed">
                      {clause.preview || 'No preview available.'}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="space-y-8">
            <div className="glass-card p-8 space-y-8">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center space-x-3">
                    <FileText className="w-6 h-6 text-blue-400" />
                    <span>
                      {selectedClauseIndex !== null
                        ? `Clause ${selectedClauseIndex + 1}`
                        : 'Select a clause'}
                    </span>
                  </h3>
                  <p className="text-gray-400 mt-2 max-w-2xl">
                    Brief your AI co-pilot with playbook guidance, risk appetite, or counterparty
                    positions. Generate tailored alternatives, capture acceptance, and log every
                    counter.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleRequestSuggestion}
                    disabled={selectedClauseIndex === null || suggestionLoading}
                    className="btn-primary px-6 py-3 rounded-2xl flex items-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {suggestionLoading ? (
                      <div className="flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Drafting…</span>
                      </div>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Request AI Alternative</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleAcceptSuggestion}
                    disabled={selectedClauseIndex === null}
                    className="btn-ghost border border-green-500/40 text-green-200 hover:border-green-400 hover:text-white px-6 py-3 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Accept into Draft</span>
                  </button>
                  <button
                    onClick={handleResetClause}
                    disabled={selectedClauseIndex === null}
                    className="btn-ghost border border-gray-700 px-6 py-3 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RefreshCcw className="w-5 h-5" />
                    <span>Reset Clause</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-300">Playbook Nuance</label>
                  <textarea
                    value={playbookGuidance}
                    onChange={(e) => setPlaybookGuidance(e.target.value)}
                    placeholder="Eg. Cap indemnity to fees paid, insist on mutual liability for IP infringement."
                    className="w-full bg-gray-800/60 border border-gray-700 rounded-2xl px-5 py-4 text-white min-h-[120px] focus:outline-none focus:border-blue-500 focus:border-glow text-sm"
                  />
                </div>
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-300">Negotiation Goal</label>
                  <textarea
                    value={negotiationGoal}
                    onChange={(e) => setNegotiationGoal(e.target.value)}
                    placeholder="Eg. Secure faster termination rights if SLAs missed."
                    className="w-full bg-gray-800/60 border border-gray-700 rounded-2xl px-5 py-4 text-white min-h-[120px] focus:outline-none focus:border-blue-500 focus:border-glow text-sm"
                  />
                </div>
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-300">Preferred Tone</label>
                  <input
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    placeholder="Collaborative, firm, aggressive…"
                    className="w-full bg-gray-800/60 border border-gray-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 focus:border-glow text-sm"
                  />
                </div>
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-300">Counterparty Position</label>
                  <textarea
                    value={counterpartyPosition}
                    onChange={(e) => setCounterpartyPosition(e.target.value)}
                    placeholder="Eg. Vendor wants unlimited liability carve-out for data breaches."
                    className="w-full bg-gray-800/60 border border-gray-700 rounded-2xl px-5 py-4 text-white min-h-[120px] focus:outline-none focus:border-blue-500 focus:border-glow text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="glass-card p-8 space-y-6">
              <h4 className="text-xl font-bold text-white flex items-center space-x-3">
                <MessageCircle className="w-5 h-5 text-purple-400" />
                <span>AI Alternative Draft</span>
              </h4>
              <textarea
                value={aiSuggestion}
                onChange={(e) => setAiSuggestion(e.target.value)}
                placeholder="AI drafted alternative will appear here. You can edit before accepting."
                className="w-full bg-gray-900/60 border border-gray-700 rounded-2xl px-6 py-5 text-white min-h-[220px] focus:outline-none focus:border-blue-500 focus:border-glow text-base leading-relaxed"
              />
              {guidanceSummary && (
                <div className="glass-card border border-purple-500/30 p-6 space-y-3">
                  <div className="text-sm uppercase tracking-wide text-purple-300">Playbook Guidance</div>
                  <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{guidanceSummary}</ReactMarkdown>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-300">Internal Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Capture decision rationale, risk comments, or instructions for teammates."
                    className="w-full bg-gray-900/60 border border-gray-700 rounded-2xl px-6 py-4 text-white min-h-[120px] focus:outline-none focus:border-blue-500 focus:border-glow text-sm"
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-300">Counterparty Feedback</label>
                  <textarea
                    value={counterpartyFeedback}
                    onChange={(e) => setCounterpartyFeedback(e.target.value)}
                    placeholder="Summarise counter's comments, open issues, or concessions."
                    className="w-full bg-gray-900/60 border border-gray-700 rounded-2xl px-6 py-4 text-white min-h-[120px] focus:outline-none focus:border-blue-500 focus:border-glow text-sm"
                  />
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-400">Response Status:</span>
                    <select
                      value={counterpartyStatus}
                      onChange={(e) => setCounterpartyStatus(e.target.value)}
                      className="bg-gray-900/60 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="pending">Pending Review</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                      <option value="needs_revision">Needs Revision</option>
                    </select>
                  </div>
                  <button
                    onClick={handleLogCounterpartyResponse}
                    disabled={selectedClauseIndex === null}
                    className="btn-ghost border border-purple-500/40 text-purple-200 hover:border-purple-400 hover:text-white px-6 py-3 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-3"
                  >
                    <Users className="w-5 h-5" />
                    <span>Log Counterparty Response</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="glass-card p-8 space-y-6">
              <h4 className="text-xl font-bold text-white flex items-center space-x-3">
                <History className="w-5 h-5 text-blue-400" />
                <span>Audit Timeline</span>
              </h4>
              {historyLoading ? (
                <div className="text-gray-400 text-center py-8">Loading version history…</div>
              ) : history.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No activity recorded yet for this clause. Generate an alternative or log a response
                  to build the history.
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((entry) => (
                    <div
                      key={entry.id || entry.created_at}
                      className="glass-card bg-gray-900/70 border border-gray-700 p-5 rounded-2xl"
                    >
                      <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                        <span className="font-semibold text-blue-200 uppercase tracking-wide">
                          {entry.status?.replace(/_/g, ' ') || 'Event'}
                        </span>
                        <span>{entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}</span>
                      </div>
                      {entry.final_text && (
                        <div className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                          {entry.final_text}
                        </div>
                      )}
                      {(entry.notes || entry.counterparty_feedback) && (
                        <div className="mt-3 text-sm text-gray-300 space-y-1">
                          {entry.notes && (
                            <div>
                              <span className="font-semibold text-gray-400">Notes: </span>
                              {entry.notes}
                            </div>
                          )}
                          {entry.counterparty_feedback && (
                            <div>
                              <span className="font-semibold text-gray-400">Counterparty: </span>
                              {entry.counterparty_feedback}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Pricing Component
function Pricing() {
  const plans = [
    {
      name: 'Starter',
      price: '₹999',
      period: '/month',
      description: 'Perfect for individual lawyers',
      features: [
        '50 document uploads per month',
        '200 AI queries per month',
        'Basic legal analysis',
        'Email support',
        'Standard processing speed'
      ],
      popular: false
    },
    {
      name: 'Professional',
      price: '₹2,999',
      period: '/month',
      description: 'Ideal for law firms',
      features: [
        '200 document uploads per month',
        '1000 AI queries per month',
        'Advanced legal analysis',
        'Priority support',
        'Fast processing speed',
        'Team collaboration',
        'Custom legal templates'
      ],
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large organizations',
      features: [
        'Unlimited document uploads',
        'Unlimited AI queries',
        'Premium legal analysis',
        '24/7 dedicated support',
        'Fastest processing',
        'Advanced team features',
        'Custom integrations',
        'SLA guarantee'
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-cosmic">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Header */}
        <div className="text-center mb-24 animate-fade-in-up">
          <h1 className="text-6xl md:text-7xl font-black text-white mb-12 animate-float leading-tight">
            Simple, Transparent 
            <span className="text-gradient-accent block mt-4">Pricing</span>
          </h1>
          <p className="text-2xl text-gray-300 max-w-5xl mx-auto leading-relaxed font-medium">
            Choose the perfect plan for your legal practice. All plans include access to our advanced AI technology.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-24">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`relative glass-card card-hover p-10 animate-scale-in ${
                plan.popular
                  ? 'border-glow ring-2 ring-blue-500/30 scale-105'
                  : ''
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {plan.popular && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-full text-lg font-bold animate-pulse-glow">
                    🌟 Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-10">
                <h3 className="text-3xl font-black text-gradient-primary mb-4">{plan.name}</h3>
                <p className="text-gray-400 mb-8 text-xl font-medium">{plan.description}</p>
                <div className="flex items-baseline justify-center">
                  <span className="text-6xl font-black text-white">{plan.price}</span>
                  <span className="text-gray-400 ml-3 text-xl font-medium">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-5 mb-10">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center text-gray-300 text-lg font-medium">
                    <CheckCircle className="w-7 h-7 text-green-400 mr-5 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button 
                className={`w-full py-5 px-8 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center text-xl ${
                  plan.popular
                    ? 'btn-primary'
                    : 'btn-ghost'
                }`}
              >
                Get Started
                <ArrowRight className="w-6 h-6 ml-4" />
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="animate-fade-in-up">
          <h2 className="text-5xl font-black text-white text-center mb-20">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {[
              {
                question: "Is there a free trial?",
                answer: "Yes, we offer a 7-day free trial for all new users to explore our platform."
              },
              {
                question: "Can I cancel anytime?",
                answer: "You can cancel your subscription at any time with no cancellation fees."
              },
              {
                question: "Is my data secure?",
                answer: "Yes, we use enterprise-grade encryption and comply with Indian data protection laws."
              },
              {
                question: "Do you offer custom plans?",
                answer: "Yes, we can create custom enterprise plans tailored to your organization's needs."
              }
            ].map((faq, index) => (
              <div key={index} className="glass-card card-hover p-8" style={{ animationDelay: `${index * 0.1}s` }}>
                <h3 className="text-2xl font-bold text-gradient-primary mb-6">{faq.question}</h3>
                <p className="text-gray-300 text-xl leading-relaxed font-medium">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main App with Router
function App() {
  return (
    <Router>
      <div className="App video-optimized">
        <Navigation />
        <Routes>
          <Route path="/" element={<MainApp />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/negotiation" element={<NegotiationSandbox />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
