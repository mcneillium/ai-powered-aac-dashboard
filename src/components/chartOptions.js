import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, LineElement, PointElement,
  ArcElement, BarElement, Title, ChartTooltip, Legend, Filler
);

const tooltipConfig = {
  enabled: true,
  mode: 'index',
  intersect: false,
  position: 'nearest',
  backgroundColor: 'rgba(0,0,0,0.7)',
  titleColor: '#fff',
  bodyColor: '#fff',
  padding: 8,
  cornerRadius: 4,
  displayColors: true,
};

const chartBaseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 0 },
  elements: {
    line: { tension: 0.1 },
    point: { radius: 3, hitRadius: 10, hoverRadius: 5 }
  },
  plugins: {
    legend: { position: 'top' },
    tooltip: tooltipConfig
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { maxRotation: 0, autoSkip: true, autoSkipPadding: 10 }
    },
    y: {
      beginAtZero: true,
      ticks: { precision: 0 },
    }
  }
};

// Line chart options (same as base)
export const lineChartOptions = { ...chartBaseOptions };

// Pie chart options (legend on right)
export const pieChartOptions = {
  ...chartBaseOptions,
  plugins: {
    ...chartBaseOptions.plugins,
    legend: { position: 'right' },
    tooltip: tooltipConfig
  }
};

// Bar chart options (hide legend)
export const barChartOptions = {
  ...chartBaseOptions,
  plugins: {
    ...chartBaseOptions.plugins,
    legend: { display: false },
    tooltip: tooltipConfig
  }
};
