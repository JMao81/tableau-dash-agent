'use client';

import React from 'react';
import WizardContainer from '@/components/wizard/WizardContainer';
import BusinessChallenge from '@/components/wizard/BusinessChallenge';

export default function DashboardWizard() {
  const wizardSteps = [
    {
      id: 'challenge',
      title: 'Tell us about your challenge',
      description: 'Help us understand what insights you need from your dashboard.',
      component: <BusinessChallenge onDataChange={() => {}} data={{}} />
    },
    {
      id: 'inspiration',
      title: 'Find design inspiration',
      description: 'Browse professionally designed dashboards that match your needs.',
      component: <div className="text-center py-12 text-gray-500">Gallery component coming soon...</div>
    },
    {
      id: 'questions',
      title: 'Key questions to answer',
      description: 'What are the most important questions your dashboard should answer?',
      component: <div className="text-center py-12 text-gray-500">Questions component coming soon...</div>
    },
    {
      id: 'data',
      title: 'Data preferences',
      description: 'Tell us about your data needs and we\'ll generate realistic examples.',
      component: <div className="text-center py-12 text-gray-500">Data preferences component coming soon...</div>
    },
    {
      id: 'review',
      title: 'Review and create',
      description: 'Review your choices and let AI create your professional dashboard.',
      component: <div className="text-center py-12 text-gray-500">Review component coming soon...</div>
    }
  ];

  const handleWizardComplete = (data: any) => {
    console.log('Wizard completed with data:', data);
    // Here we'll integrate with our AI backend to generate the dashboard
  };

  return (
    <WizardContainer 
      steps={wizardSteps}
      onComplete={handleWizardComplete}
    />
  );
}