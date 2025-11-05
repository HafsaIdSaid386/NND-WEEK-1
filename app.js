// Titanic EDA Dashboard - Client-side JavaScript
// Dataset: https://www.kaggle.com/competitions/titanic/data
// Features: Pclass, Sex, Age, SibSp, Parch, Fare, Embarked
// Target: Survived (0/1, train only)
// Identifier: PassengerId (exclude from analysis)

class TitanicEDA {
    constructor() {
        this.mergedData = null;
        this.trainData = null;
        this.testData = null;
        this.charts = {}; // Store chart instances
        this.initEventListeners();
    }

    initEventListeners() {
        document.getElementById('loadDataBtn').addEventListener('click', () => this.loadAndMergeData());
        document.getElementById('runStatsBtn').addEventListener('click', () => this.generateStatistics());
        document.getElementById('runVizBtn').addEventListener('click', () => this.generateVisualizations());
        document.getElementById('exportCsvBtn').addEventListener('click', () => this.exportCSV());
        document.getElementById('exportJsonBtn').addEventListener('click', () => this.exportJSON());
    }

    // Load and merge train.csv and test.csv files
    loadAndMergeData() {
        const trainFile = document.getElementById('trainFile').files[0];
        const testFile = document.getElementById('testFile').files[0];
        
        if (!trainFile || !testFile) {
            alert('Please upload both train.csv and test.csv files');
            return;
        }

        const loadStatus = document.getElementById('loadStatus');
        loadStatus.innerHTML = 'Loading files...';

        // Parse train.csv
        Papa.parse(trainFile, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (trainResults) => {
                console.log('Train data loaded:', trainResults.data.length, 'rows');
                
                if (trainResults.errors.length > 0) {
                    alert('Error parsing train.csv: ' + trainResults.errors[0].message);
                    return;
                }
                
                this.trainData = trainResults.data.map(row => ({ ...row, source: 'train' }));
                
                // Parse test.csv
                Papa.parse(testFile, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    complete: (testResults) => {
                        console.log('Test data loaded:', testResults.data.length, 'rows');
                        
                        if (testResults.errors.length > 0) {
                            alert('Error parsing test.csv: ' + testResults.errors[0].message);
                            return;
                        }
                        
                        this.testData = testResults.data.map(row => ({ ...row, source: 'test' }));
                        this.mergeDatasets();
                        loadStatus.innerHTML = `✅ Data loaded successfully! 
                            <br>Train: ${this.trainData.length} rows 
                            <br>Test: ${this.testData.length} rows
                            <br>Total: ${this.mergedData.length} rows`;
                        this.showSection('overview');
                        this.generateOverview();
                    }
                });
            }
        });
    }

    // Merge train and test datasets, adding source column
    mergeDatasets() {
        this.mergedData = [...this.trainData, ...this.testData];
        console.log('Merged dataset shape:', this.mergedData.length, 'rows ×', Object.keys(this.mergedData[0]).length, 'columns');
    }

    // Show/hide sections
    showSection(sectionId) {
        document.getElementById(sectionId).style.display = 'block';
    }

    // Generate dataset overview
    generateOverview() {
        const overviewContent = document.getElementById('overviewContent');
        const shapeInfo = `Dataset Shape: ${this.mergedData.length} rows × ${Object.keys(this.mergedData[0]).length} columns`;
        
        // Data source breakdown
        const trainCount = this.mergedData.filter(row => row.source === 'train').length;
        const testCount = this.mergedData.filter(row => row.source === 'test').length;
        
        let previewHtml = `<h3>${shapeInfo}</h3>`;
        previewHtml += `<p><strong>Data Source Breakdown:</strong> Train (${trainCount} rows) + Test (${testCount} rows)</p>`;
        
        // Column information
        previewHtml += '<h4>Columns:</h4><ul>';
        const columns = Object.keys(this.mergedData[0]);
        columns.forEach(col => {
            previewHtml += `<li><strong>${col}</strong>`;
            // Show sample values for first few rows
            const sampleValues = [...new Set(this.mergedData.slice(0, 5).map(row => row[col]).filter(val => val !== undefined && val !== ''))];
            if (sampleValues.length > 0) {
                previewHtml += ` - Sample: ${sampleValues.slice(0, 3).join(', ')}${sampleValues.length > 3 ? '...' : ''}`;
            }
            previewHtml += '</li>';
        });
        previewHtml += '</ul>';
        
        // Preview first 5 rows in a scrollable table
        previewHtml += '<h4>Data Preview (first 5 rows):</h4>';
        previewHtml += '<div class="data-preview"><table><tr>';
        
        // Create table headers
        columns.forEach(header => {
            previewHtml += `<th>${header}</th>`;
        });
        previewHtml += '</tr>';
        
        // Create table rows
        for (let i = 0; i < Math.min(5, this.mergedData.length); i++) {
            previewHtml += '<tr>';
            columns.forEach(header => {
                const value = this.mergedData[i][header];
                previewHtml += `<td>${value !== undefined && value !== '' ? value : '<em>empty</em>'}</td>`;
            });
            previewHtml += '</tr>';
        }
        previewHtml += '</table></div>';
        
        overviewContent.innerHTML = previewHtml;
        
        // Show subsequent sections
        this.showSection('missingValues');
        this.showSection('statsSummary');
        this.showSection('visualizations');
        this.showSection('export');
        this.generateMissingValues();
    }

    // Calculate and display missing values
    generateMissingValues() {
        const missingContent = document.getElementById('missingContent');
        missingContent.innerHTML = ''; // Clear previous content
        
        const headers = Object.keys(this.mergedData[0]);
        const missingCounts = {};
        const missingPercentages = {};
        
        // Calculate missing values
        headers.forEach(header => {
            const missing = this.mergedData.filter(row => 
                row[header] === null || row[header] === undefined || row[header] === '' || 
                (typeof row[header] === 'number' && isNaN(row[header]))
            ).length;
            missingCounts[header] = missing;
            missingPercentages[header] = ((missing / this.mergedData.length) * 100).toFixed(2);
        });
        
        // Create bar chart for missing values
        const canvas = document.createElement('canvas');
        canvas.id = 'missingChart';
        canvas.className = 'chart-container';
        missingContent.appendChild(canvas);
        
        // Destroy existing chart if it exists
        if (this.charts.missingChart) {
            this.charts.missingChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        this.charts.missingChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: headers,
                datasets: [{
                    label: 'Missing Values (%)',
                    data: headers.map(h => missingPercentages[h]),
                    backgroundColor: headers.map(h => missingPercentages[h] > 0 ? 'rgba(255, 99, 132, 0.6)' : 'rgba(75, 192, 192, 0.6)'),
                    borderColor: headers.map(h => missingPercentages[h] > 0 ? 'rgba(255, 99, 132, 1)' : 'rgba(75, 192, 192, 1)'),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Percentage Missing'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Columns'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Missing Values by Column'
                    }
                }
            }
        });
        
        // Create table with missing values
        let missingHtml = '<h4>Missing Values Details:</h4>';
        missingHtml += '<table><tr><th>Column</th><th>Missing Count</th><th>Missing %</th><th>Status</th></tr>';
        headers.forEach(header => {
            const status = missingCounts[header] > 0 ? '❌ Has missing' : '✅ Complete';
            missingHtml += `<tr>
                <td>${header}</td>
                <td>${missingCounts[header]}</td>
                <td>${missingPercentages[header]}%</td>
                <td>${status}</td>
            </tr>`;
        });
        missingHtml += '</table>';
        
        missingContent.innerHTML += missingHtml;
    }

    // Generate statistical summary
    generateStatistics() {
        const statsContent = document.getElementById('statsContent');
        statsContent.innerHTML = '<h3>📊 Statistical Summary</h3>';
        
        // Numeric columns analysis
        const numericCols = ['Age', 'SibSp', 'Parch', 'Fare'];
        let numericHtml = '<h4>Numeric Columns Summary:</h4><table>';
        numericHtml += '<tr><th>Column</th><th>Mean</th><th>Median</th><th>Std Dev</th><th>Min</th><th>Max</th></tr>';
        
        numericCols.forEach(col => {
            const values = this.mergedData.map(row => row[col]).filter(val => val !== null && val !== undefined && !isNaN(val));
            if (values.length > 0) {
                const mean = values.reduce((a, b) => a + b, 0) / values.length;
                const sorted = [...values].sort((a, b) => a - b);
                const median = sorted[Math.floor(sorted.length / 2)];
                const variance = values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length;
                const stdDev = Math.sqrt(variance);
                const min = Math.min(...values);
                const max = Math.max(...values);
                
                numericHtml += `<tr>
                    <td>${col}</td>
                    <td>${mean.toFixed(2)}</td>
                    <td>${median.toFixed(2)}</td>
                    <td>${stdDev.toFixed(2)}</td>
                    <td>${min.toFixed(2)}</td>
                    <td>${max.toFixed(2)}</td>
                </tr>`;
            }
        });
        numericHtml += '</table>';
        
        // Categorical columns analysis
        const categoricalCols = ['Pclass', 'Sex', 'Embarked'];
        let categoricalHtml = '<h4>Categorical Columns Counts:</h4>';
        
        categoricalCols.forEach(col => {
            categoricalHtml += `<h5>${col}:</h5><table><tr><th>Value</th><th>Count</th><th>Percentage</th></tr>`;
            const counts = {};
            this.mergedData.forEach(row => {
                if (row[col] !== null && row[col] !== undefined && row[col] !== '') {
                    counts[row[col]] = (counts[row[col]] || 0) + 1;
                }
            });
            
            Object.entries(counts).forEach(([value, count]) => {
                const percentage = ((count / this.mergedData.length) * 100).toFixed(1);
                categoricalHtml += `<tr><td>${value}</td><td>${count}</td><td>${percentage}%</td></tr>`;
            });
            categoricalHtml += '</table>';
        });
        
        // Survival analysis (train data only)
        if (this.trainData && this.trainData[0].Survived !== undefined) {
            let survivalHtml = '<h4>🎯 Survival Analysis (Train Data Only):</h4>';
            const survivedCount = this.trainData.filter(row => row.Survived === 1).length;
            const notSurvivedCount = this.trainData.filter(row => row.Survived === 0).length;
            const total = this.trainData.length;
            
            survivalHtml += `<p><strong>Overall Survival:</strong> ${survivedCount} survived (${((survivedCount/total)*100).toFixed(1)}%) vs ${notSurvivedCount} did not survive (${((notSurvivedCount/total)*100).toFixed(1)}%)</p>`;
            
            // Survival by Sex
            survivalHtml += '<h5>Survival by Sex:</h5><table><tr><th>Sex</th><th>Total</th><th>Survived</th><th>Not Survived</th><th>Survival Rate</th></tr>';
            const sexes = [...new Set(this.trainData.map(row => row.Sex).filter(val => val))];
            sexes.forEach(sex => {
                const sexData = this.trainData.filter(row => row.Sex === sex);
                const sexSurvived = sexData.filter(row => row.Survived === 1).length;
                const sexNotSurvived = sexData.filter(row => row.Survived === 0).length;
                const survivalRate = ((sexSurvived / sexData.length) * 100).toFixed(1);
                
                survivalHtml += `<tr>
                    <td>${sex}</td>
                    <td>${sexData.length}</td>
                    <td>${sexSurvived}</td>
                    <td>${sexNotSurvived}</td>
                    <td>${survivalRate}%</td>
                </tr>`;
            });
            survivalHtml += '</table>';
            
            // Survival by Pclass
            survivalHtml += '<h5>Survival by Passenger Class:</h5><table><tr><th>Class</th><th>Total</th><th>Survived</th><th>Not Survived</th><th>Survival Rate</th></tr>';
            const classes = [1, 2, 3];
            classes.forEach(pclass => {
                const classData = this.trainData.filter(row => row.Pclass === pclass);
                const classSurvived = classData.filter(row => row.Survived === 1).length;
                const classNotSurvived = classData.filter(row => row.Survived === 0).length;
                const survivalRate = ((classSurvived / classData.length) * 100).toFixed(1);
                
                survivalHtml += `<tr>
                    <td>${pclass}</td>
                    <td>${classData.length}</td>
                    <td>${classSurvived}</td>
                    <td>${classNotSurvived}</td>
                    <td>${survivalRate}%</td>
                </tr>`;
            });
            survivalHtml += '</table>';
            
            statsContent.innerHTML += survivalHtml;
        }
        
        statsContent.innerHTML += numericHtml + categoricalHtml;
    }

    // Generate visualizations
    generateVisualizations() {
        const vizContent = document.getElementById('vizContent');
        vizContent.innerHTML = '<h3>📈 Data Visualizations</h3>';
        
        // Clear existing charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
        
        // Create a grid layout for charts
        vizContent.innerHTML += `
            <div class="charts-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 20px;">
                <div class="chart-item">
                    <h4>Sex Distribution</h4>
                    <div class="chart-container">
                        <canvas id="sexChart"></canvas>
                    </div>
                </div>
                <div class="chart-item">
                    <h4>Passenger Class Distribution</h4>
                    <div class="chart-container">
                        <canvas id="pclassChart"></canvas>
                    </div>
                </div>
                <div class="chart-item">
                    <h4>Embarkation Port Distribution</h4>
                    <div class="chart-container">
                        <canvas id="embarkedChart"></canvas>
                    </div>
                </div>
                <div class="chart-item">
                    <h4>Age Distribution</h4>
                    <div class="chart-container">
                        <canvas id="ageChart"></canvas>
                    </div>
                </div>
                <div class="chart-item">
                    <h4>Fare Distribution</h4>
                    <div class="chart-container">
                        <canvas id="fareChart"></canvas>
                    </div>
                </div>
            </div>
        `;

        // Add survival charts if train data is available
        if (this.trainData && this.trainData[0].Survived !== undefined) {
            vizContent.innerHTML += `
                <div class="charts-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 20px; margin-top: 30px;">
                    <div class="chart-item">
                        <h4>Survival by Passenger Class</h4>
                        <div class="chart-container">
                            <canvas id="survivalPclassChart"></canvas>
                        </div>
                    </div>
                    <div class="chart-item">
                        <h4>Survival by Sex</h4>
                        <div class="chart-container">
                            <canvas id="survivalSexChart"></canvas>
                        </div>
                    </div>
                </div>
            `;
        }

        // Generate charts after a small delay to ensure DOM is updated
        setTimeout(() => {
            this.createBarChart('Sex Distribution', 'sexChart', 'Sex');
            this.createBarChart('Passenger Class Distribution', 'pclassChart', 'Pclass');
            this.createBarChart('Embarkation Port Distribution', 'embarkedChart', 'Embarked');
            this.createHistogram('Age Distribution', 'ageChart', 'Age');
            this.createHistogram('Fare Distribution', 'fareChart', 'Fare');
            
            if (this.trainData && this.trainData[0].Survived !== undefined) {
                this.createSurvivalChart('Survival by Passenger Class', 'survivalPclassChart', 'Pclass');
                this.createSurvivalChart('Survival by Sex', 'survivalSexChart', 'Sex');
            }
        }, 100);
    }

    // Helper method to create bar charts
    createBarChart(title, canvasId, column) {
        const counts = {};
        this.mergedData.forEach(row => {
            if (row[column] !== null && row[column] !== undefined && row[column] !== '') {
                counts[row[column]] = (counts[row[column]] || 0) + 1;
            }
        });
        
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element with id ${canvasId} not found`);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(counts),
                datasets: [{
                    label: `Count of ${column}`,
                    data: Object.values(counts),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: title
                    }
                }
            }
        });
    }

    // Helper method to create histograms
    createHistogram(title, canvasId, column) {
        const values = this.mergedData.map(row => row[column]).filter(val => val !== null && val !== undefined && !isNaN(val));
        
        if (values.length === 0) {
            const container = document.getElementById(canvasId).parentElement;
            container.innerHTML = `<p>No data available for ${column}</p>`;
            return;
        }
        
        // Create bins for histogram
        const min = Math.min(...values);
        const max = Math.max(...values);
        const binCount = Math.min(20, Math.ceil(values.length / 10));
        const binSize = (max - min) / binCount;
        
        const bins = Array(binCount).fill(0);
        values.forEach(value => {
            const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
            bins[binIndex]++;
        });
        
        const binLabels = Array.from({length: binCount}, (_, i) => 
            (min + i * binSize).toFixed(1) + '-' + (min + (i+1) * binSize).toFixed(1)
        );
        
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element with id ${canvasId} not found`);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: binLabels,
                datasets: [{
                    label: `Frequency of ${column}`,
                    data: bins,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: title
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: column
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Frequency'
                        }
                    }
                }
            }
        });
    }

    // Helper method to create survival charts
    createSurvivalChart(title, canvasId, column) {
        const categories = [...new Set(this.trainData.map(row => row[column]).filter(val => val !== undefined && val !== ''))];
        const survivedData = [];
        const notSurvivedData = [];
        
        categories.forEach(category => {
            const categoryData = this.trainData.filter(row => row[column] === category);
            survivedData.push(categoryData.filter(row => row.Survived === 1).length);
            notSurvivedData.push(categoryData.filter(row => row.Survived === 0).length);
        });
        
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element with id ${canvasId} not found`);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [
                    {
                        label: 'Survived',
                        data: survivedData,
                        backgroundColor: 'rgba(75, 192, 192, 0.6)'
                    },
                    {
                        label: 'Not Survived',
                        data: notSurvivedData,
                        backgroundColor: 'rgba(255, 99, 132, 0.6)'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: title
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: column
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Count'
                        }
                    }
                }
            }
        });
    }

    // Export merged data as CSV
    exportCSV() {
        if (!this.mergedData || this.mergedData.length === 0) {
            alert('No data to export');
            return;
        }
        
        try {
            const csv = Papa.unparse(this.mergedData);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', 'titanic_merged_data.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            document.getElementById('exportStatus').innerHTML = '✅ CSV exported successfully!';
        } catch (error) {
            alert('Error exporting CSV: ' + error.message);
        }
    }

    // Export JSON summary
    exportJSON() {
        if (!this.mergedData || this.mergedData.length === 0) {
            alert('No data to export');
            return;
        }
        
        try {
            // Calculate some basic statistics for the summary
            const numericCols = ['Age', 'SibSp', 'Parch', 'Fare'];
            const numericStats = {};
            
            numericCols.forEach(col => {
                const values = this.mergedData.map(row => row[col]).filter(val => val !== null && val !== undefined && !isNaN(val));
                if (values.length > 0) {
                    const mean = values.reduce((a, b) => a + b, 0) / values.length;
                    numericStats[col] = {
                        mean: parseFloat(mean.toFixed(2)),
                        count: values.length,
                        missing: this.mergedData.length - values.length
                    };
                }
            });
            
            const summary = {
                datasetInfo: {
                    totalRows: this.mergedData.length,
                    totalColumns: Object.keys(this.mergedData[0]).length,
                    trainRows: this.trainData ? this.trainData.length : 0,
                    testRows: this.testData ? this.testData.length : 0,
                    columns: Object.keys(this.mergedData[0])
                },
                survivalStats: this.trainData ? {
                    survived: this.trainData.filter(row => row.Survived === 1).length,
                    notSurvived: this.trainData.filter(row => row.Survived === 0).length,
                    survivalRate: parseFloat(((this.trainData.filter(row => row.Survived === 1).length / this.trainData.length) * 100).toFixed(1))
                } : null,
                numericStats: numericStats,
                generatedAt: new Date().toISOString()
            };
            
            const jsonStr = JSON.stringify(summary, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', 'titanic_summary.json');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            document.getElementById('exportStatus').innerHTML = '✅ JSON summary exported successfully!';
        } catch (error) {
            alert('Error exporting JSON: ' + error.message);
        }
    }
}

// Initialize the EDA dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TitanicEDA();
    console.log('Titanic EDA Dashboard initialized');
});

// Reuse note: To adapt for other datasets, update:
// 1. The data schema (features, target variable)
// 2. File input labels and validation
// 3. Column names in analysis methods
// 4. Dataset URLs in documentation
