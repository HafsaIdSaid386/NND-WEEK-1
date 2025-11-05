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
            quotes: true,
            complete: (trainResults) => {
                if (trainResults.errors.length > 0) {
                    alert('Error parsing train.csv: ' + trainResults.errors[0].message);
                    return;
                }
                
                this.trainData = trainResults.data.map(row => ({ ...row, source: 'train' }));
                
                // Parse test.csv
                Papa.parse(testFile, {
                    header: true,
                    dynamicTyping: true,
                    quotes: true,
                    complete: (testResults) => {
                        if (testResults.errors.length > 0) {
                            alert('Error parsing test.csv: ' + testResults.errors[0].message);
                            return;
                        }
                        
                        this.testData = testResults.data.map(row => ({ ...row, source: 'test' }));
                        this.mergeDatasets();
                        loadStatus.innerHTML = 'Data loaded successfully!';
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
        console.log('Merged dataset:', this.mergedData);
    }

    // Show/hide sections
    showSection(sectionId) {
        document.getElementById(sectionId).style.display = 'block';
    }

    // Generate dataset overview
    generateOverview() {
        const overviewContent = document.getElementById('overviewContent');
        const shapeInfo = `Dataset Shape: ${this.mergedData.length} rows × ${Object.keys(this.mergedData[0]).length} columns`;
        
        // Preview first 5 rows
        let previewHtml = `<h3>${shapeInfo}</h3>`;
        previewHtml += '<h4>Data Preview (first 5 rows):</h4>';
        previewHtml += '<table><tr>';
        
        // Create table headers
        const headers = Object.keys(this.mergedData[0]);
        headers.forEach(header => {
            previewHtml += `<th>${header}</th>`;
        });
        previewHtml += '</tr>';
        
        // Create table rows
        for (let i = 0; i < Math.min(5, this.mergedData.length); i++) {
            previewHtml += '<tr>';
            headers.forEach(header => {
                previewHtml += `<td>${this.mergedData[i][header]}</td>`;
            });
            previewHtml += '</tr>';
        }
        previewHtml += '</table>';
        
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
        let missingHtml = '<h4>Missing Values by Column:</h4>';
        
        const headers = Object.keys(this.mergedData[0]);
        const missingCounts = {};
        const missingPercentages = {};
        
        // Calculate missing values
        headers.forEach(header => {
            const missing = this.mergedData.filter(row => 
                row[header] === null || row[header] === undefined || row[header] === '' || isNaN(row[header])
            ).length;
            missingCounts[header] = missing;
            missingPercentages[header] = ((missing / this.mergedData.length) * 100).toFixed(2);
        });
        
        // Create bar chart for missing values
        const canvas = document.createElement('canvas');
        canvas.id = 'missingChart';
        canvas.className = 'chart-container';
        missingContent.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: headers,
                datasets: [{
                    label: 'Missing Values (%)',
                    data: headers.map(h => missingPercentages[h]),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
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
                }
            }
        });
        
        // Create table with missing values
        missingHtml += '<table><tr><th>Column</th><th>Missing Count</th><th>Missing %</th></tr>';
        headers.forEach(header => {
            missingHtml += `<tr><td>${header}</td><td>${missingCounts[header]}</td><td>${missingPercentages[header]}%</td></tr>`;
        });
        missingHtml += '</table>';
        
        missingContent.innerHTML += missingHtml;
    }

    // Generate statistical summary
    generateStatistics() {
        const statsContent = document.getElementById('statsContent');
        statsContent.innerHTML = '<h3>Statistical Summary</h3>';
        
        // Numeric columns analysis
        const numericCols = ['Age', 'SibSp', 'Parch', 'Fare'];
        let numericHtml = '<h4>Numeric Columns Summary:</h4><table>';
        numericHtml += '<tr><th>Column</th><th>Mean</th><th>Median</th><th>Std Dev</th><th>Min</th><th>Max</th></tr>';
        
        numericCols.forEach(col => {
            const values = this.mergedData.map(row => row[col]).filter(val => !isNaN(val));
            if (values.length > 0) {
                const mean = values.reduce((a, b) => a + b, 0) / values.length;
                const sorted = [...values].sort((a, b) => a - b);
                const median = sorted[Math.floor(sorted.length / 2)];
                const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);
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
            categoricalHtml += `<h5>${col}:</h5><table><tr><th>Value</th><th>Count</th></tr>`;
            const counts = {};
            this.mergedData.forEach(row => {
                if (row[col] !== null && row[col] !== undefined) {
                    counts[row[col]] = (counts[row[col]] || 0) + 1;
                }
            });
            
            Object.entries(counts).forEach(([value, count]) => {
                categoricalHtml += `<tr><td>${value}</td><td>${count}</td></tr>`;
            });
            categoricalHtml += '</table>';
        });
        
        // Survival analysis (train data only)
        if (this.trainData && this.trainData[0].Survived !== undefined) {
            let survivalHtml = '<h4>Survival Analysis (Train Data):</h4>';
            const survivedCount = this.trainData.filter(row => row.Survived === 1).length;
            const notSurvivedCount = this.trainData.filter(row => row.Survived === 0).length;
            const total = this.trainData.length;
            
            survivalHtml += `<p>Survived: ${survivedCount} (${((survivedCount/total)*100).toFixed(2)}%)</p>`;
            survivalHtml += `<p>Not Survived: ${notSurvivedCount} (${((notSurvivedCount/total)*100).toFixed(2)}%)</p>`;
            
            // Survival by Sex
            survivalHtml += '<h5>Survival by Sex:</h5><table><tr><th>Sex</th><th>Survived</th><th>Not Survived</th><th>Survival Rate</th></tr>';
            const sexes = [...new Set(this.trainData.map(row => row.Sex))];
            sexes.forEach(sex => {
                const sexData = this.trainData.filter(row => row.Sex === sex);
                const sexSurvived = sexData.filter(row => row.Survived === 1).length;
                const sexNotSurvived = sexData.filter(row => row.Survived === 0).length;
                const survivalRate = ((sexSurvived / sexData.length) * 100).toFixed(2);
                
                survivalHtml += `<tr>
                    <td>${sex}</td>
                    <td>${sexSurvived}</td>
                    <td>${sexNotSurvived}</td>
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
        vizContent.innerHTML = '<h3>Data Visualizations</h3>';
        
        // Bar chart for Sex distribution
        this.createBarChart('Sex Distribution', 'sexChart', 'Sex', vizContent);
        
        // Bar chart for Pclass distribution
        this.createBarChart('Passenger Class Distribution', 'pclassChart', 'Pclass', vizContent);
        
        // Bar chart for Embarked distribution
        this.createBarChart('Embarkation Port Distribution', 'embarkedChart', 'Embarked', vizContent);
        
        // Histogram for Age
        this.createHistogram('Age Distribution', 'ageChart', 'Age', vizContent);
        
        // Histogram for Fare
        this.createHistogram('Fare Distribution', 'fareChart', 'Fare', vizContent);
        
        // Survival by Pclass (if train data available)
        if (this.trainData && this.trainData[0].Survived !== undefined) {
            this.createSurvivalChart('Survival by Passenger Class', 'survivalPclassChart', 'Pclass', vizContent);
        }
    }

    // Helper method to create bar charts
    createBarChart(title, canvasId, column, container) {
        const counts = {};
        this.mergedData.forEach(row => {
            if (row[column] !== null && row[column] !== undefined) {
                counts[row[column]] = (counts[row[column]] || 0) + 1;
            }
        });
        
        const canvas = document.createElement('canvas');
        canvas.id = canvasId;
        canvas.className = 'chart-container';
        container.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
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
    createHistogram(title, canvasId, column, container) {
        const values = this.mergedData.map(row => row[column]).filter(val => !isNaN(val));
        
        // Create bins for histogram
        const min = Math.min(...values);
        const max = Math.max(...values);
        const binCount = 20;
        const binSize = (max - min) / binCount;
        
        const bins = Array(binCount).fill(0);
        values.forEach(value => {
            const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
            bins[binIndex]++;
        });
        
        const binLabels = Array.from({length: binCount}, (_, i) => 
            (min + i * binSize).toFixed(1) + '-' + (min + (i+1) * binSize).toFixed(1)
        );
        
        const canvas = document.createElement('canvas');
        canvas.id = canvasId;
        canvas.className = 'chart-container';
        container.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
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
    createSurvivalChart(title, canvasId, column, container) {
        const categories = [...new Set(this.trainData.map(row => row[column]))];
        const survivedData = [];
        const notSurvivedData = [];
        
        categories.forEach(category => {
            const categoryData = this.trainData.filter(row => row[column] === category);
            survivedData.push(categoryData.filter(row => row.Survived === 1).length);
            notSurvivedData.push(categoryData.filter(row => row.Survived === 0).length);
        });
        
        const canvas = document.createElement('canvas');
        canvas.id = canvasId;
        canvas.className = 'chart-container';
        container.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
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
            
            document.getElementById('exportStatus').innerHTML = 'CSV exported successfully!';
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
            const summary = {
                datasetInfo: {
                    totalRows: this.mergedData.length,
                    totalColumns: Object.keys(this.mergedData[0]).length,
                    trainRows: this.trainData ? this.trainData.length : 0,
                    testRows: this.testData ? this.testData.length : 0
                },
                columns: Object.keys(this.mergedData[0]),
                // Add more summary statistics as needed
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
            
            document.getElementById('exportStatus').innerHTML = 'JSON summary exported successfully!';
        } catch (error) {
            alert('Error exporting JSON: ' + error.message);
        }
    }
}

// Initialize the EDA dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TitanicEDA();
});

// Reuse note: To adapt for other datasets, update:
// 1. The data schema (features, target variable)
// 2. File input labels and validation
// 3. Column names in analysis methods
// 4. Dataset URLs in documentation
