// Define feature groups
const musicalCharacteristics = [
    'danceability', 'energy', 'loudness', 'speechiness',
    'acousticness', 'instrumentalness', 'liveness', 'valence', 'time_signature'
];

const technicalFeatures = [
    'spectral_centroid', 'spectral_bandwidth', 'spectral_rolloff',
    'zero_crossing_rate', 'chroma_stft', 'beat_strength',
    'harmonic_to_percussive_ratio', 'speech_to_music_ratio', 'tempogram'
];

// Set up the heatmap dimensions
const margin = {top: 50, right: 100, bottom: 100, left: 150};
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Create color scale
const colorScale = d3.scaleSequential()
    .domain([-1, 1])
    .interpolator(d3.interpolateRdBu);

// Create SVG container
const svg = d3.select('#heatmap')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

// Function to update visualization
function updateVisualization(minPlatforms) {
    // Filter data based on minimum platforms
    const filteredData = processedData.filter(d => d.hitPlatforms >= minPlatforms);
    
    // Update song count display
    document.getElementById('song-count').textContent = 
        `Analyzing ${filteredData.length} songs with ${minPlatforms}+ successful platforms`;

    if (filteredData.length === 0) {
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('error-message').innerText = 
            `No songs found with ${minPlatforms} or more successful platforms`;
        return;
    }

    // Calculate correlation matrix between musical and technical features
    const correlationMatrix = [];
    musicalCharacteristics.forEach(musical => {
        const row = [];
        technicalFeatures.forEach(technical => {
            const values1 = filteredData.map(d => d[musical]);
            const values2 = filteredData.map(d => d[technical]);
            const correlation = calculateCorrelation(values1, values2);
            row.push(correlation);
        });
        correlationMatrix.push(row);
    });

    // Create scales
    const x = d3.scaleBand()
        .range([0, width])
        .domain(technicalFeatures)
        .padding(0.05);

    const y = d3.scaleBand()
        .range([height, 0])
        .domain(musicalCharacteristics)
        .padding(0.05);

    // Clear previous visualization
    svg.selectAll('*').remove();

    // Add X axis
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');

    // Add Y axis
    svg.append('g')
        .call(d3.axisLeft(y));

    // Create the heatmap cells
    musicalCharacteristics.forEach((musical, i) => {
        technicalFeatures.forEach((technical, j) => {
            const correlation = correlationMatrix[i][j];
            
            svg.append('rect')
                .attr('x', x(technical))
                .attr('y', y(musical))
                .attr('width', x.bandwidth())
                .attr('height', y.bandwidth())
                .style('fill', colorScale(correlation))
                .style('stroke', 'white')
                .style('stroke-width', 1)
                .on('mouseover', function(event) {
                    // Show tooltip
                    const tooltip = d3.select('#tooltip');
                    tooltip.style('visibility', 'visible')
                        .html(`
                            <strong>${musical}</strong> ↔ <strong>${technical}</strong><br>
                            Correlation: ${correlation.toFixed(3)}<br>
                            <span style="color: ${Math.abs(correlation) > 0.7 ? '#d32f2f' : Math.abs(correlation) > 0.4 ? '#f57c00' : '#666'}">
                                ${Math.abs(correlation) > 0.7 ? 'Strong' : Math.abs(correlation) > 0.4 ? 'Moderate' : 'Weak'}
                                ${correlation < 0 ? 'Negative' : 'Positive'} Correlation
                            </span>
                        `)
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 10) + 'px');

                    // Highlight cell
                    d3.select(this)
                        .style('stroke', '#000')
                        .style('stroke-width', 2);
                })
                .on('mouseout', function() {
                    // Hide tooltip
                    d3.select('#tooltip').style('visibility', 'hidden');
                    
                    // Remove highlight
                    d3.select(this)
                        .style('stroke', 'white')
                        .style('stroke-width', 1);
                });
        });
    });

    // Add title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -margin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text(`Correlation between Musical and Technical Features (${minPlatforms}+ Successful Platforms)`);

    // Add color scale legend
    const legendWidth = 200;
    const legendHeight = 20;

    const legendScale = d3.scaleLinear()
        .domain([-1, 1])
        .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
        .tickValues([-1, -0.5, 0, 0.5, 1])
        .tickFormat(d3.format('.1f'));

    const defs = svg.append('defs');

    const linearGradient = defs.append('linearGradient')
        .attr('id', 'correlation-gradient');

    linearGradient.selectAll('stop')
        .data(d3.range(-1, 1.1, 0.1))
        .enter().append('stop')
        .attr('offset', d => ((d + 1) / 2 * 100) + '%')
        .attr('stop-color', d => colorScale(d));

    const legend = svg.append('g')
        .attr('transform', `translate(${width - legendWidth},${height + margin.bottom - 30})`);

    legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#correlation-gradient)');

    legend.append('g')
        .attr('transform', `translate(0,${legendHeight})`)
        .call(legendAxis);

    legend.append('text')
        .attr('x', legendWidth / 2)
        .attr('y', legendHeight + 35)
        .attr('text-anchor', 'middle')
        .text('Correlation Strength');
}

// Load and process the data
fetch('https://raw.githubusercontent.com/aliciatay/CS5346/main/final_df_cleaned.csv')
    .then(response => response.text())
    .then(csvText => {
        const data = d3.csvParse(csvText);
        
        // Process data
        processedData = data.map(d => {
            const processed = {};
            [...musicalCharacteristics, ...technicalFeatures].forEach(feature => {
                processed[feature] = +d[feature] || 0;
            });
            const platforms = ['Spotify_Hit', 'YouTube_Hit', 'TikTok_Hit', 'Deezer_Hit', 'Amazon_Hit'];
            processed.hitPlatforms = platforms.filter(platform => d[platform] === 'True').length;
            return processed;
        });

        // Set up filter change listener
        d3.select('#platform-filter').on('change', function() {
            updateVisualization(+this.value);
        });

        // Initial visualization
        updateVisualization(0);
    })
    .catch(error => {
        console.error('Error loading data:', error);
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('error-message').innerText = `Error: ${error.message}`;
    });

// Utility function to calculate correlation
function calculateCorrelation(x, y) {
    const n = x.length;
    const xMean = d3.mean(x);
    const yMean = d3.mean(y);
    
    let numerator = 0;
    let xDenom = 0;
    let yDenom = 0;
    
    for (let i = 0; i < n; i++) {
        const xDiff = x[i] - xMean;
        const yDiff = y[i] - yMean;
        numerator += xDiff * yDiff;
        xDenom += xDiff * xDiff;
        yDenom += yDiff * yDiff;
    }
    
    if (xDenom === 0 || yDenom === 0) return 0;
    return numerator / Math.sqrt(xDenom * yDenom);
} 