import React from 'react';
import { Chart } from 'primereact/chart';

const ChartsSection = ({
  studentsPerCollegeData,
  sessionTypesData,
  counselingSessionsData,
  yearPerCollegesData,
  remarksDistributionData,
  chartOptions
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {/* Counseling Sessions Over Time (Line Chart) */}
      <ChartCard 
        title="Counseling Sessions Over Time"
        type="line"
        data={counselingSessionsData}
        options={chartOptions}
      />

      {/* Students per College (Pie Chart) */}
      <ChartCard 
        title="Students per College"
        type="pie"
        data={studentsPerCollegeData}
        options={chartOptions}
      />

      {/* Session Types (Bar Chart) */}
      <ChartCard 
        title="Session Types"
        type="bar"
        data={sessionTypesData}
        options={chartOptions}
      />

      {/* Year per Colleges (Bar Chart) */}
      <ChartCard 
        title="Year Distribution"
        type="bar"
        data={yearPerCollegesData}
        options={chartOptions}
      />

      {/* Remarks Distribution (Pie Chart) */}
      <ChartCard 
        title="Remarks Distribution"
        type="pie"
        data={remarksDistributionData}
        options={chartOptions}
        className="md:col-span-2 lg:col-span-2"
      />
    </div>
  );
};

// Helper component for individual charts with customized tooltips
const ChartCard = ({ title, type, data, options, className = '' }) => {
  // Create custom options based on chart type
  const getCustomOptions = () => {
    // Start with the base options
    const customOptions = { ...options };
    
    // For pie charts, customize the tooltip to show percentages
    if (type === 'pie' || type === 'doughnut') {
      customOptions.plugins = {
        ...customOptions.plugins,
        tooltip: {
          callbacks: {
            label: function(context) {
              // Make sure we have valid data
              if (!context || context.raw === undefined) return 'No data';
              
              const label = context.label || 'Unknown';
              const value = context.raw || 0;
              
              // Calculate percentage
              let percentage = 0;
              if (context.dataset && Array.isArray(context.dataset.data)) {
                const total = context.dataset.data.reduce((sum, val) => sum + (val || 0), 0);
                if (total > 0) {
                  percentage = Math.round((value / total) * 100);
                }
              }
              
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      };
    }
    
    // For bar and line charts, show the value directly
    if (type === 'bar' || type === 'line') {
      customOptions.plugins = {
        ...customOptions.plugins,
        tooltip: {
          callbacks: {
            label: function(context) {
              if (!context) return 'No data';
              
              const label = context.dataset.label || '';
              const value = context.raw || 0;
              
              return `${label}: ${value}`;
            }
          }
        }
      };
    }
    
    return customOptions;
  };

  return (
    <div className={`bg-white border p-4 rounded-lg shadow-md mx-2 ${className}`}>
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      {data && data.labels && data.labels.length > 0 && data.datasets && data.datasets.length > 0 ? (
        <Chart 
          type={type} 
          data={data} 
          options={getCustomOptions()} 
          style={{ width: '100%', height: '200px' }} 
        />
      ) : (
        <div className="flex justify-center items-center h-[200px] text-gray-500">No data available</div>
      )}
    </div>
  );
};

export default ChartsSection;