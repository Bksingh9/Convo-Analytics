import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import Dashboard from './Dashboard';
import Ingest from './Ingest';
import Translator from './Translator';
import Conversations from './Conversations';
import QualityAssurance from './QualityAssurance';
import ModelTraining from './ModelTraining';

const Index = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'ingest':
        return <Ingest />;
      case 'analytics':
        return (
          <div className="p-8">
            <h2 className="text-4xl font-bold mb-4">Advanced Analytics</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">Comprehensive analytics and reporting dashboard coming soon...</p>
          </div>
        );
      case 'interactions':
        return <Conversations />;
      case 'quality-assurance':
        return <QualityAssurance />;
      case 'model-training':
        return <ModelTraining />;
      case 'compliance':
        return (
          <div className="p-8">
            <h2 className="text-4xl font-bold mb-4">Compliance Management</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">Enterprise compliance and regulatory management coming soon...</p>
          </div>
        );
      case 'reports':
        return (
          <div className="p-8">
            <h2 className="text-4xl font-bold mb-4">Business Reports</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">Comprehensive business intelligence reports coming soon...</p>
          </div>
        );
      case 'insights':
        return (
          <div className="p-8">
            <h2 className="text-4xl font-bold mb-4">AI Insights</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">Advanced AI-powered insights and recommendations coming soon...</p>
          </div>
        );
      case 'alerts':
        return (
          <div className="p-8">
            <h2 className="text-4xl font-bold mb-4">Alert Management</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">Real-time alerts and notification management coming soon...</p>
          </div>
        );
      case 'users':
        return (
          <div className="p-8">
            <h2 className="text-4xl font-bold mb-4">User Management</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">Enterprise user and role management coming soon...</p>
          </div>
        );
      case 'integrations':
        return (
          <div className="p-8">
            <h2 className="text-4xl font-bold mb-4">Integrations</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">Third-party integrations and API management coming soon...</p>
          </div>
        );
      case 'performance':
        return (
          <div className="p-8">
            <h2 className="text-4xl font-bold mb-4">Performance Monitoring</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">System performance and optimization tools coming soon...</p>
          </div>
        );
      case 'billing':
        return (
          <div className="p-8">
            <h2 className="text-4xl font-bold mb-4">Billing & Usage</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">Usage tracking and billing management coming soon...</p>
          </div>
        );
      case 'settings':
        return (
          <div className="p-8">
            <h2 className="text-4xl font-bold mb-4">System Settings</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">System configuration and preferences coming soon...</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <MainLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </MainLayout>
  );
};

export default Index;
