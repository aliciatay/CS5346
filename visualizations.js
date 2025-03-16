// Correlation matrix visualization
function drawCorrelationMatrix(data, filteredData) {
    const correlationDiv = d3.select('#correlation-matrix');
    correlationDiv.html(''); // Clear previous content

    // Calculate success metrics
    const streamsMedian = d3.median(filteredData, d => d.streams);
    const playlistMedian = d3.median(filteredData, d => d.playlists);

    // Create success score (0-1) based on streams and playlist count
    filteredData.forEach(d => {
        d.successScore = (
            (d.streams > streamsMedian ? 1 : 0) +
            (d.playlists > playlistMedian ? 1 : 0)
        ) / 2;
    });

    // Calculate correlations between features and success
    const correlations = {};
    features.forEach(feature => {
        const featureValues = filteredData.map(d => d.features[feature]);
        const successValues = filteredData.map(d => d.successScore);
        correlations[feature] = calculateCorrelation(featureValues, successValues);
    });

    // Set up the matrix dimensions
    const width = 600;
    const height = 400;
    const margin = { top: 40, right: 40, bottom: 40, left: 120 };

    const svg = correlationDiv.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create color scale
    const colorScale = d3.scaleLinear()
        .domain([-1, 0, 1])
        .range(['#ff4444', '#ffffff', '#44ff44']);

    // Draw correlation cells
    const features = Object.keys(correlations);
    const cellHeight = height / features.length;
    const cellWidth = 40;

    // Add feature labels
    svg.selectAll('.feature-label')
        .data(features)
        .enter()
        .append('text')
        .attr('class', 'feature-label')
        .attr('x', -10)
        .attr('y', (d, i) => i * cellHeight + cellHeight / 2)
        .attr('text-anchor', 'end')
        .attr('alignment-baseline', 'middle')
        .text(d => featureLabels[d]);

    // Add correlation cells
    const cells = svg.selectAll('.correlation-cell')
        .data(features)
        .enter()
        .append('g')
        .attr('class', 'correlation-cell');

    cells.append('rect')
        .attr('x', 0)
        .attr('y', (d, i) => i * cellHeight)
        .attr('width', cellWidth)
        .attr('height', cellHeight)
        .style('fill', d => colorScale(correlations[d]));

    cells.append('text')
        .attr('x', cellWidth / 2)
        .attr('y', (d, i) => i * cellHeight + cellHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .style('font-size', '12px')
        .text(d => correlations[d].toFixed(2));

    // Add title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text('Correlation with Success');
}

// Distribution plots
function drawDistributionPlots(data, filteredData, hits, nonHits) {
    const distributionDiv = d3.select('#distribution-plots');
    distributionDiv.html(''); // Clear previous content

    const width = 800;
    const height = 150;
    const margin = { top: 20, right: 30, bottom: 30, left: 60 };

    features.forEach(feature => {
        const svg = distributionDiv.append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Get feature values
        const hitsValues = hits.map(d => d.features[feature]);
        const nonHitsValues = nonHits.map(d => d.features[feature]);

        // Create scales
        const xScale = d3.scaleLinear()
            .domain([0, 1])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, Math.max(
                d3.max(d3.histogram()(hitsValues), d => d.length),
                d3.max(d3.histogram()(nonHitsValues), d => d.length)
            )])
            .range([height, 0]);

        // Draw axes
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        svg.append('g')
            .call(d3.axisLeft(yScale));

        // Create histogram generator
        const histogram = d3.histogram()
            .domain(xScale.domain())
            .thresholds(20);

        // Generate histogram data
        const hitsHist = histogram(hitsValues);
        const nonHitsHist = histogram(nonHitsValues);

        // Draw distributions
        const area = d3.area()
            .x(d => xScale(d.x0))
            .y0(height)
            .y1(d => yScale(d.length));

        // Draw hits distribution
        svg.append('path')
            .datum(hitsHist)
            .attr('fill', colors.hits.fill)
            .attr('stroke', colors.hits.stroke)
            .attr('stroke-width', 1)
            .attr('d', area);

        // Draw non-hits distribution
        svg.append('path')
            .datum(nonHitsHist)
            .attr('fill', colors.nonHits.fill)
            .attr('stroke', colors.nonHits.stroke)
            .attr('stroke-width', 1)
            .attr('d', area);

        // Add feature label
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -5)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text(featureLabels[feature]);
    });
}

// Helper function to calculate correlation coefficient
function calculateCorrelation(x, y) {
    const n = x.length;
    const xMean = d3.mean(x);
    const yMean = d3.mean(y);
    
    const numerator = d3.sum(x.map((xi, i) => (xi - xMean) * (y[i] - yMean)));
    const denominator = Math.sqrt(
        d3.sum(x.map(xi => Math.pow(xi - xMean, 2))) *
        d3.sum(y.map(yi => Math.pow(yi - yMean, 2)))
    );
    
    return numerator / denominator;
}

// Update visualization based on selected type
function updateVisualizationType() {
    const selectedViz = d3.select('#viz-selector').property('value');
    
    // Hide all visualizations
    d3.selectAll('.viz-section').style('display', 'none');
    
    // Show selected visualization
    d3.select(`#${selectedViz}-chart`).style('display', 'block');
    
    // Update the current visualization
    updateVisualization(
        data,
        +d3.select('#year-slider').property('value'),
        d3.select('#genre-selector').property('value')
    );
} 