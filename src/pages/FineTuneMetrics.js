// src/pages/FineTuneMetrics.js
import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import {
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Chip
} from '@mui/material';
import { DB_PATHS } from '../shared/schema';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend, Filler);

export default function FineTuneMetrics() {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const metricsRef = ref(db, DB_PATHS.FINE_TUNE_METRICS);
    const unsubscribe = onValue(metricsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const arr = Object.entries(data)
        .map(([id, entry]) => ({ id, ...entry }))
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setMetrics(arr);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const latestLoss = metrics.length > 0 ? metrics[metrics.length - 1].loss : null;
  const latestAcc = metrics.length > 0 ? metrics[metrics.length - 1].accuracy : null;
  const totalEpochs = metrics.length;
  const improvement = metrics.length >= 2
    ? ((metrics[0].loss - metrics[metrics.length - 1].loss) / metrics[0].loss * 100).toFixed(1)
    : null;

  const chartData = {
    labels: metrics.map((_, i) => `${i + 1}`),
    datasets: [
      {
        label: 'Loss',
        data: metrics.map(e => e.loss),
        borderColor: '#f44336',
        backgroundColor: 'rgba(244,67,54,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: 'Accuracy',
        data: metrics.map(e => e.accuracy),
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76,175,80,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: {
        title: { display: true, text: 'Training epoch' },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Value' },
      },
    },
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Fine-tuning metrics
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Track the on-device model's personalisation progress as it learns from user interactions.
      </Typography>

      {metrics.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No training data yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Training metrics will appear here once a user's device runs a fine-tuning session.
            The model fine-tunes automatically after 50 logged interactions.
          </Typography>
        </Paper>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Total epochs</Typography>
                  <Typography variant="h4" fontWeight={600}>{totalEpochs}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Latest loss</Typography>
                  <Typography variant="h4" fontWeight={600} color="error.main">
                    {latestLoss?.toFixed(4) || '\u2014'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Latest accuracy</Typography>
                  <Typography variant="h4" fontWeight={600} color="success.main">
                    {latestAcc ? `${(latestAcc * 100).toFixed(1)}%` : '\u2014'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Loss improvement</Typography>
                  <Typography variant="h4" fontWeight={600} color="info.main">
                    {improvement ? `${improvement}%` : '\u2014'}
                  </Typography>
                  {improvement && (
                    <Chip
                      label={parseFloat(improvement) > 0 ? 'Improving' : 'Needs data'}
                      size="small"
                      color={parseFloat(improvement) > 0 ? 'success' : 'warning'}
                      sx={{ mt: 0.5 }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>Training progress</Typography>
            <Box sx={{ height: 320 }}>
              <Line data={chartData} options={chartOptions} />
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
}
