// src/components/DashboardCharts.js
import React from 'react';
import { Line, Pie, Bar } from 'react-chartjs-2';
import {
  lineChartOptions,
  pieChartOptions,
  barChartOptions
} from './chartOptions';

export const Charts = React.memo(
  function Charts({ lineData, pieData, barData }) {
    return (
      <>
        <div style={{ height: 300, width: '100%', marginBottom: 32 }}>
          <Line data={lineData} options={lineChartOptions} />
        </div>
        <div style={{ height: 300, width: '100%', marginBottom: 32 }}>
          <Pie data={pieData} options={pieChartOptions} />
        </div>
        <div style={{ height: 300, width: '100%' }}>
          <Bar data={barData} options={barChartOptions} />
        </div>
      </>
    );
  },
  (prev, next) =>
    prev.lineData === next.lineData &&
    prev.pieData  === next.pieData  &&
    prev.barData  === next.barData
);
