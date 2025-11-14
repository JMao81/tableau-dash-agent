'use client';

import React, { useState } from 'react';

interface BusinessChallengeProps {
  onDataChange: (data: any) => void;
  data: any;
}

const challengeOptions = [
  {
    id: 'performance',
    title: 'Track Performance',
    description: 'Monitor KPIs and metrics over time',
    icon: '📊',
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
  },
  {
    id: 'trends',
    title: 'Analyze Trends',
    description: 'Identify patterns and insights in your data',
    icon: '🔍',
    color: 'bg-green-50 border-green-200 hover:bg-green-100'
  },
  {
    id: 'compare',
    title: 'Compare Segments',
    description: 'Compare different groups or categories',
    icon: '⚖️',
    color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
  },
  {
    id: 'forecast',
    title: 'Predict Future',
    description: 'Forecast trends and plan ahead',
    icon: '🔮',
    color: 'bg-orange-50 border-orange-200 hover:bg-orange-100'
  }
];

const industries = [
  'Sales & Marketing',
  'Customer Support',
  'Human Resources', 
  'Finance & Accounting',
  'Operations',
  'E-commerce',
  'Healthcare',
  'Education',
  'Other'
];

export default function BusinessChallenge({ onDataChange, data }: BusinessChallengeProps) {
  const [selectedChallenge, setSelectedChallenge] = useState(data.challenge || '');
  const [selectedIndustry, setSelectedIndustry] = useState(data.industry || '');

  const handleChallengeSelect = (challengeId: string) => {
    setSelectedChallenge(challengeId);
    onDataChange({
      challenge: challengeId,
      industry: selectedIndustry
    });
  };

  const handleIndustrySelect = (industry: string) => {
    setSelectedIndustry(industry);
    onDataChange({
      challenge: selectedChallenge,
      industry: industry
    });
  };

  return (
    <div className="space-y-8">
      {/* Challenge Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          What's your main business challenge?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challengeOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleChallengeSelect(option.id)}
              className={`
                p-6 border-2 rounded-lg text-left transition-all duration-200
                ${selectedChallenge === option.id 
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                  : option.color
                }
              `}
            >
              <div className="flex items-start space-x-4">
                <span className="text-3xl">{option.icon}</span>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {option.title}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Industry Selection */}
      {selectedChallenge && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            What industry or domain?
          </h3>
          <select
            value={selectedIndustry}
            onChange={(e) => handleIndustrySelect(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select your industry...</option>
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Summary */}
      {selectedChallenge && selectedIndustry && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-green-600">✓</span>
            <span className="text-green-800 font-medium">
              Perfect! You want to {challengeOptions.find(c => c.id === selectedChallenge)?.title.toLowerCase()} for {selectedIndustry}.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}