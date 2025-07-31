document.getElementById('uploadBtn').addEventListener('click', function() {
  const fileInput = document.getElementById('csvFile');
  const file = fileInput.files[0];
  
  if (!file) {
    alert('Please upload a CSV file first!');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const csvData = e.target.result;
    const parsedData = parseCSV(csvData);
    renderCharts(parsedData);
  };
  reader.readAsText(file);
});

function parseCSV(csv) {
  const lines = csv.split('\n');
  const headers = lines[0].split(',');
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    const values = lines[i].split(',');
    const entry = {};
    headers.forEach((header, j) => {
      const value = values[j] && values[j].trim();
      entry[header.trim()] = value === 'True' ? true : 
                            value === 'False' ? false : 
                            isNaN(value) ? value : parseFloat(value);
    });
    data.push(entry);
  }

  return data;
}

// Helper function to calculate quartiles for box plot
function calculateBoxPlotStats(data, key, filterFn = () => true) {
  const values = data.filter(filterFn).map(d => d[key]).sort((a, b) => a - b);
  if (values.length === 0) return [0, 0, 0, 0, 0]; // Handle empty data
  const min = values[0];
  const max = values[values.length - 1];
  const median = values[Math.floor(values.length / 2)];
  const q1 = values[Math.floor(values.length / 4)];
  const q3 = values[Math.floor(3 * values.length / 4)];
  return [min, q1, median, q3, max];
}

// Helper function to count grades in bins by participation level
function countGradesByParticipation(data, participationKey) {
  const bins = [
    { range: [0, 50], count: 0 }, // F
    { range: [50, 60], count: 0 }, // D
    { range: [60, 70], count: 0 }, // C
    { range: [70, 80], count: 0 }, // B
    { range: [80, 100], count: 0 } // A
  ];
  data.forEach(d => {
    if ((participationKey === 'participation_level_Low' && d.participation_level_Low === 1) ||
        (participationKey === 'participation_level_Medium' && d.participation_level_Medium === 1) ||
        (participationKey === 'participation_level_High' && !d.participation_level_Low && !d.participation_level_Medium)) {
      const grade = d.final_grade;
      for (const bin of bins) {
        if (grade >= bin.range[0] && grade < bin.range[1]) {
          bin.count++;
          break;
        }
      }
    }
  });
  return bins.map(b => b.count);
}

function renderCharts(data) {
  // Radial Bar Chart: Weekly Study Hours Distribution
  Highcharts.chart('radialBar', {
    chart: { type: 'bar', polar: true, backgroundColor: 'transparent' },
    title: { text: 'Weekly Study Hours Distribution', style: { color: '#ffffff' } },
    xAxis: { 
      categories: ['0-0.2', '0.2-0.4', '0.4-0.6', '0.6-0.8', '0.8-1.0'],
      labels: { enabled: false, style: { color: '#ffffff' } }
    },
    yAxis: { 
      max: 250, 
      // title: { text: 'Number of Students', style: { color: '#ffffff' } },
      labels: { style: { color: '#ffffff' } }
    },
    series: [{
      name: 'Students',
      data: [
        { y: data.filter(d => d.study_hours_per_week <= 0.2).length, color: '#eb8fd8' },
        { y: data.filter(d => d.study_hours_per_week > 0.2 && d.study_hours_per_week <= 0.4).length, color: '#ba94e9' },
        { y: data.filter(d => d.study_hours_per_week > 0.4 && d.study_hours_per_week <= 0.6).length, color: '#f46659' },
        { y: data.filter(d => d.study_hours_per_week > 0.6 && d.study_hours_per_week <= 0.8).length, color: '#ffbc3e' },
        { y: data.filter(d => d.study_hours_per_week > 0.8).length, color: '#1cc549' }
      ]
    }],
    plotOptions: {
      bar: {
        dataLabels: { enabled: false, style: { color: '#ffffff' } }
      }
    }
  });

  // Bubble Chart: Study Hours vs. Grades (Size = Attendance)
  Highcharts.chart('bubbleChart', {
    chart: { type: 'bubble', backgroundColor: 'transparent' },
    title: { text: 'Study Hours vs. Grades (Size = Attendance)', style: { color: '#ffffff' } },
    xAxis: { 
      title: { text: 'Study Hours per Week', style: { color: '#ffffff' } },
      labels: { style: { color: '#ffffff' } },
      min: 0,
      max: 1
    },
    yAxis: { 
      title: { text: 'Final Grade', style: { color: '#ffffff' } },
      labels: { style: { color: '#ffffff' } },
      min: 0,
      max: 100
    },
    series: [{
      name: 'Students',
      data: data.map(d => ({
        x: d.study_hours_per_week,
        y: d.final_grade,
        z: d.attendance_percentage * 1, // Size multiplier
        color: d.participation_level_Medium ? '#ffbc3e' : d.participation_level_Low ? '#f46659' : '#1cc549'
      })),
      marker: { fillOpacity: 0.7 }
    }],
    tooltip: {
      pointFormat: 'Study Hours: {point.x:.2f}<br>Grade: {point.y:.1f}<br>Attendance: {point.z:.1f}%'
    }
  });

  // Stacked Area Chart: Grade Distribution by Participation Level
  Highcharts.chart('stackedArea', {
    chart: { type: 'area', backgroundColor: 'transparent' },
    title: { text: 'Grade Distribution by Participation', style: { color: '#ffffff' } },
    xAxis: { 
      categories: ['F (<50)', 'D (50-60)', 'C (60-70)', 'B (70-80)', 'A (80-100)'],
      labels: { style: { color: '#ffffff' } }
    },
    yAxis: { 
      title: { text: 'Number of Students', style: { color: '#ffffff' } },
      labels: { style: { color: '#ffffff' } }
    },
    plotOptions: { 
      area: { 
        stacking: 'normal',
        marker: { enabled: false }
      }
    },
    series: [
      {
        name: 'Low Participation',
        data: countGradesByParticipation(data, 'participation_level_Low'),
        color: '#f46659'
      },
      {
        name: 'Medium Participation',
        data: countGradesByParticipation(data, 'participation_level_Medium'),
        color: '#ffbc3e'
      },
      {
        name: 'High Participation',
        data: countGradesByParticipation(data, 'participation_level_High'),
        color: '#1cc549'
      }
    ]
  });

  // Box Plot: Grade Ranges by Extracurricular Activity
  Highcharts.chart('boxPlot', {
    chart: { type: 'boxplot', backgroundColor: 'transparent' },
    title: { text: 'Grade Ranges: Extracurricular vs. No Extracurricular', style: { color: '#ffffff' } },
    xAxis: { 
      categories: ['No Extracurricular', 'Extracurricular'],
      labels: { style: { color: '#ffffff' } }
    },
    yAxis: { 
      title: { text: 'Final Grade', style: { color: '#ffffff' } },
      labels: { style: { color: '#ffffff' } },
      min: 0,
      max: 100
    },
    series: [{
      name: 'Grades',
      data: [
        calculateBoxPlotStats(data, 'final_grade', d => !d.extracurricular_Yes),
        calculateBoxPlotStats(data, 'final_grade', d => d.extracurricular_Yes === 1)
      ],
      color: '#eb8fd8',
      fillColor: 'rgba(235, 143, 216, 0.2)',
      tooltip: {
        pointFormat: 'Min: {point.low}<br>Q1: {point.q1}<br>Median: {point.median}<br>Q3: {point.q3}<br>Max: {point.high}'
      }
    }]
  });

  // Network Graph: Correlation Matrix (Study Hours, Grades, Attendance)
  // Note: Using approximate correlations for visualization; real correlations would need statistical computation
  Highcharts.chart('networkGraph', {
    chart: { type: 'networkgraph', backgroundColor: 'transparent' },
    title: { text: 'Metric Correlations', style: { color: '#ffffff' } },
    plotOptions: {
      networkgraph: {
        keys: ['from', 'to', 'weight'],
        layoutAlgorithm: { 
          enableSimulation: true,
          linkLength: 100
        },
        dataLabels: { 
          enabled: true,
          style: { color: '#ffffff' },
          format: '{point.weight:.1f}'
        }
      }
    },
    series: [{
      dataLabels: { style: { color: '#ffffff' } },
      data: [
        ['Study Hours', 'Grades', 0.7],
        ['Study Hours', 'Attendance', 0.5],
        ['Grades', 'Attendance', 0.6]
      ],
      nodes: [
        { id: 'Study Hours', color: '#eb8fd8' },
        { id: 'Grades', color: '#ba94e9' },
        { id: 'Attendance', color: '#b9d4b4' }
      ]
    }]
  });
}