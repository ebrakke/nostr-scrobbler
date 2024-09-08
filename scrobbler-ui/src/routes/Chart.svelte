<script lang="ts">
  import { onMount } from 'svelte';
  import { Chart, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, BarController } from 'chart.js';
  import type { NostrEvent } from '$lib/types';

  Chart.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, BarController);

  export let events: NostrEvent[];

  let chartCanvas: HTMLCanvasElement;

  function getListenTimeData(events: NostrEvent[]) {
    const hourCounts = new Array(24).fill(0);
    events.forEach(event => {
      if (event.created_at) {
        const hour = new Date(event.created_at * 1000).getHours();
        hourCounts[hour]++;
      }
    });
    return hourCounts;
  }

  onMount(() => {
    const ctx = chartCanvas.getContext('2d');
    if (ctx) {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: Array.from({length: 24}, (_, i) => `${i}:00`),
          datasets: [{
            label: 'Listens per Hour',
            data: getListenTimeData(events),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: false
            },
            title: {
              display: true,
              text: 'Listening Activity by Hour'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Listens'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Hour of Day'
              }
            }
          }
        }
      });
    }
  });
</script>

<canvas bind:this={chartCanvas}></canvas>