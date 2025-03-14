// src/pages/FineTuneMetrics.js
import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import { Container, Typography, Paper } from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend);

export default function FineTuneMetrics() {
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    const metricsRef = ref(db, 'fineTuneMetrics');
    const unsubscribe = onValue(metricsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const metricsArray = Object.entries(data).map(([id, entry]) => ({ id, ...entry }));
      console.log("Fetched fineTuneMetrics:", metricsArray);
      // Sort metrics by epoch number.
      metricsArray.sort((a, b) => a.epoch - b.epoch);
      setMetrics(metricsArray);
    });
    return () => unsubscribe();
  }, []);

  if (metrics.length === 0) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Fine-Tuning Progress
        </Typography>
        <Paper sx={{ p: 2 }}>
          <Typography variant="body1" align="center">
            No training metrics found. Please run a fine-tuning session to see progress.
          </Typography>
        </Paper>
      </Container>
    );
  }

  const chartData = {
    labels: metrics.map(entry => `Epoch ${entry.epoch}`),
    datasets: [
      {
        label: 'Loss',
        data: metrics.map(entry => entry.loss),
        borderColor: 'rgba(255,99,132,1)',
        backgroundColor: 'rgba(255,99,132,0.2)',
        fill: false,
        tension: 0.1,
      },
      {
        label: 'Accuracy',
        data: metrics.map(entry => entry.accuracy),
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        fill: false,
        tension: 0.1,
      }
    ]
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Fine-Tuning Progress
      </Typography>
      <Paper sx={{ p: 2 }}>
        <Line
          data={chartData}
          options={{
            responsive: true,
            plugins: {
              legend: { position: 'top' },
              title: { display: true, text: 'Model Fine-Tuning Metrics' }
            }
          }}
        />
      </Paper>
    </Container>
  );
}
