'use client';

import React, { useState } from 'react';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
}

interface WizardContainerProps {
  steps: WizardStep[];
  onComplete: (data: any) => void;
}

export default function WizardContainer({ steps, onComplete }: WizardContainerProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [wizardData, setWizardData] = useState({});

  const currentStep = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onComplete(wizardData);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const updateWizardData = (stepData: any) => {
    setWizardData(prev => ({
      ...prev,
      [currentStep.id]: stepData
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {currentStep.title}
            </h2>
            <p className="text-gray-600">
              {currentStep.description}
            </p>
          </div>

          {/* Step Component */}
          <div className="mb-8">
            {React.cloneElement(currentStep.component as React.ReactElement, {
              onDataChange: updateWizardData,
              data: wizardData[currentStep.id] || {}
            })}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t border-gray-200">
            <button
              onClick={handleBack}
              disabled={currentStepIndex === 0}
              className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Back
            </button>
            
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {currentStepIndex === steps.length - 1 ? 'Create Dashboard' : 'Continue →'}
            </button>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="mt-8 flex justify-center">
          <div className="flex space-x-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index <= currentStepIndex 
                    ? 'bg-blue-600' 
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}