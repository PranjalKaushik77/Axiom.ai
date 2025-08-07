import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Upload, MessageCircle, FileText, Zap, Menu, X, CheckCircle, ArrowRight, Star } from 'lucide-react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Navigation Component
function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="bg-dark-900/80 backdrop-blur-sm border-b border-dark-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Cortex AI</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/' 
                  ? 'text-blue-400' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Home
            </Link>
            <Link 
              to="/pricing" 
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/pricing' 
                  ? 'text-blue-400' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Pricing
            </Link>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Get Started
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-400 hover:text-white"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-dark-800 rounded-lg mt-2">
              <Link 
                to="/" 
                className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-dark-700 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/pricing" 
                className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-dark-700 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-base font-medium">
                Get Started
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
  const [file, setFile] = useState(null);
  const [contractId, setContractId] = useState(null);
  const [contractInfo, setContractInfo] = useState(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(false);

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
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to get answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-dark-900 to-dark-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Legal AI Assistant for
              <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent"> India</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Upload your legal contracts and get instant, intelligent answers to your questions. 
              Powered by advanced AI technology designed for Indian legal professionals.
            </p>
          </div>
        </div>
      </div>

      {/* Main Interface */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Upload Section */}
          <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700 p-8">
            <div className="flex items-center mb-6">
              <Upload className="w-6 h-6 text-blue-400 mr-3" />
              <h2 className="text-2xl font-semibold text-white">Upload Contract</h2>
            </div>
            
            <div className="space-y-6">
              <div className="border-2 border-dashed border-dark-600 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-white font-medium mb-2">
                    {file ? file.name : 'Choose PDF file'}
                  </div>
                  <div className="text-gray-400 text-sm">
                    Upload legal contracts up to 10MB
                  </div>
                </label>
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || uploadProgress}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                {uploadProgress ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Upload & Process
                  </>
                )}
              </button>

              {contractInfo && (
                <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                  <div className="flex items-center text-green-400 mb-2">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Contract Processed Successfully
                  </div>
                  <div className="text-gray-300 text-sm space-y-1">
                    <div>File: {contractInfo.filename}</div>
                    <div>Pages: {contractInfo.pages}</div>
                    <div>Chunks: {contractInfo.chunks}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Question Section */}
          <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700 p-8">
            <div className="flex items-center mb-6">
              <MessageCircle className="w-6 h-6 text-purple-400 mr-3" />
              <h2 className="text-2xl font-semibold text-white">Ask Question</h2>
            </div>

            <div className="space-y-6">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What are the termination clauses in this contract?"
                className="w-full h-32 bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                disabled={!contractId}
              />

              <button
                onClick={handleAskQuestion}
                disabled={!contractId || !question.trim() || loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Analyzing...
                  </div>
                ) : (
                  <>
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Get Answer
                  </>
                )}
              </button>

              {!contractId && (
                <p className="text-gray-400 text-sm text-center">
                  Upload a contract first to ask questions
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-8 bg-red-900/20 border border-red-700 rounded-lg p-4">
            <div className="text-red-400 font-medium">{error}</div>
          </div>
        )}

        {/* Answer Display */}
        {answer && (
          <div className="mt-8 bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700 p-8">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Star className="w-6 h-6 text-yellow-400 mr-3" />
              AI Analysis
            </h3>
            <div className="bg-dark-700 rounded-lg p-6">
              <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                {answer}
              </div>
            </div>
          </div>
        )}
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
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Simple, Transparent 
            <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent"> Pricing</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Choose the perfect plan for your legal practice. All plans include access to our advanced AI technology.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`relative bg-dark-800/50 backdrop-blur-sm rounded-xl border p-8 transition-all hover:scale-105 ${
                plan.popular 
                  ? 'border-blue-500 ring-2 ring-blue-500/20' 
                  : 'border-dark-700 hover:border-dark-600'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-semibold text-white mb-2">{plan.name}</h3>
                <p className="text-gray-400 mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400 ml-1">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button 
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center ${
                  plan.popular
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                    : 'bg-dark-700 hover:bg-dark-600 text-white border border-dark-600'
                }`}
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Is there a free trial?</h3>
              <p className="text-gray-300">Yes, we offer a 7-day free trial for all new users to explore our platform.</p>
            </div>
            <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Can I cancel anytime?</h3>
              <p className="text-gray-300">Absolutely! You can cancel your subscription at any time with no cancellation fees.</p>
            </div>
            <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Is my data secure?</h3>
              <p className="text-gray-300">Yes, we use enterprise-grade encryption and comply with Indian data protection laws.</p>
            </div>
            <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Do you offer custom plans?</h3>
              <p className="text-gray-300">Yes, we can create custom enterprise plans tailored to your organization's needs.</p>
            </div>
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
      <div className="App">
        <Navigation />
        <Routes>
          <Route path="/" element={<MainApp />} />
          <Route path="/pricing" element={<Pricing />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;