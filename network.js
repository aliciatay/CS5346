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

// Set up the network graph dimensions
const width = 1000;
const height = 800;

// Create color scales
const nodeColors = {
    'musical': '#ff9999',    // Light red for Musical Characteristics
    'technical': '#99ccff'   // Light blue for Technical Features
};

// Create SVG container
const svg = d3.select('#network')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

// Add zoom behavior
const g = svg.append('g');
svg.call(d3.zoom()
    .extent([[0, 0], [width, height]])
    .scaleExtent([0.5, 4])
    .on('zoom', (event) => {
        g.attr('transform', event.transform);
    }));

// Add simulation as a global variable so it persists between updates
let simulation;

// Function to update visualization
function updateVisualization(minPlatforms, selectedGenre = 'All') {
    // Filter data based on minimum platforms and genre
    let filteredData = processedData.filter(d => d.hitPlatforms >= minPlatforms);
    
    if (selectedGenre !== 'All') {
        filteredData = filteredData.filter(d => d.genre === selectedGenre);
    }
    
    // Update song count display
    document.getElementById('song-count').textContent = 
        `Analyzing ${filteredData.length} songs with ${minPlatforms}+ successful platforms${selectedGenre !== 'All' ? ` in ${selectedGenre} genre` : ''}`;

    // Always hide error message first
    document.getElementById('error-message').style.display = 'none';

    if (filteredData.length === 0) {
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('error-message').innerText = 
            `No songs found with ${minPlatforms} or more successful platforms${selectedGenre !== 'All' ? ` in ${selectedGenre} genre` : ''}`;
        return;
    }

    // Create nodes for each feature
    const nodes = [
        ...musicalCharacteristics.map(name => ({
            id: name,
            group: 'musical',
            radius: 8
        })),
        ...technicalFeatures.map(name => ({
            id: name,
            group: 'technical',
            radius: 8
        }))
    ];

    // Calculate correlations and create edges
    const edges = [];
    for (let i = 0; i < musicalCharacteristics.length; i++) {
        for (let j = 0; j < technicalFeatures.length; j++) {
            const values1 = filteredData.map(d => d[musicalCharacteristics[i]]);
            const values2 = filteredData.map(d => d[technicalFeatures[j]]);
            const correlation = calculateCorrelation(values1, values2);
            
            if (Math.abs(correlation) >= 0.3) {  // Only show stronger correlations
                edges.push({
                    source: musicalCharacteristics[i],
                    target: technicalFeatures[j],
                    value: correlation
                });
            }
        }
    }

    // After creating edges, generate correlation summary
    const strongCorrelations = edges
        .filter(d => Math.abs(d.value) >= 0.4)  // Only show moderate to strong correlations
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));  // Sort by absolute correlation strength

    // Update correlation summary panel
    const summaryPanel = d3.select('#correlation-summary');
    summaryPanel.html(`
        <h3>Strong Correlations</h3>
        <div class="summary-section">
            <h4>Positive Correlations</h4>
            ${strongCorrelations
                .filter(d => d.value > 0)
                .map(d => `
                    <div class="correlation-item">
                        <span class="feature-pair">${d.source} ↔ ${d.target}</span>
                        <span class="correlation-value" style="color: #1976d2">${d.value.toFixed(3)}</span>
                    </div>
                `).join('')}
        </div>
        <div class="summary-section">
            <h4>Negative Correlations</h4>
            ${strongCorrelations
                .filter(d => d.value < 0)
                .map(d => `
                    <div class="correlation-item">
                        <span class="feature-pair">${d.source} ↔ ${d.target}</span>
                        <span class="correlation-value" style="color: #d32f2f">${d.value.toFixed(3)}</span>
                    </div>
                `).join('')}
        </div>
    `);

    // Clear previous visualization
    g.selectAll('*').remove();

    // Create force simulation
    simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(edges)
            .id(d => d.id)
            .distance(100))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => d.radius + 20));

    // Create edge scale for width - Increased contrast
    const edgeScale = d3.scaleLinear()
        .domain([0.3, 1])
        .range([2, 8]);  // Changed from [1, 5] to [2, 8] for more contrast

    // Draw edges
    const links = g.append('g')
        .selectAll('line')
        .data(edges)
        .join('line')
        .attr('stroke', d => d.value < 0 ? '#ff0000' : '#0000ff')
        .attr('stroke-width', d => edgeScale(Math.abs(d.value)))
        .attr('stroke-opacity', 0.6);

    // Draw nodes
    const nodes_g = g.append('g')
        .selectAll('g')
        .data(nodes)
        .join('g')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Add circles for nodes
    nodes_g.append('circle')
        .attr('r', d => d.radius)
        .attr('fill', d => nodeColors[d.group])
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);

    // Add labels
    nodes_g.append('text')
        .text(d => d.id)
        .attr('x', d => d.radius + 8)  // Increased spacing
        .attr('y', (d, i) => i % 2 === 0 ? '0.31em' : '-0.31em')  // Alternate above/below
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('text-shadow', '2px 2px 4px white, -2px -2px 4px white, 2px -2px 4px white, -2px 2px 4px white');  // Add text shadow for better readability

    // Add hover interactions
    nodes_g.on('mouseover', function(event, d) {
        // Highlight connected edges and nodes
        links
            .attr('stroke-opacity', l => 
                (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1);
        nodes_g
            .attr('opacity', n => 
                n.id === d.id || edges.some(e => 
                    (e.source.id === d.id && e.target.id === n.id) || 
                    (e.target.id === d.id && e.source.id === n.id)
                ) ? 1 : 0.3);
    })
    .on('mouseout', function() {
        // Reset highlighting
        links.attr('stroke-opacity', 0.6);
        nodes_g.attr('opacity', 1);
    });

    // Add hover interactions for edges
    links.on('mouseover', function(event, d) {
        // Show tooltip
        const tooltip = d3.select('#tooltip');
        tooltip.style('visibility', 'visible')
            .html(`
                <div style="background: white; padding: 10px; border: 2px solid #333; border-radius: 5px;">
                    <div style="font-size: 14px; margin-bottom: 5px;">
                        <strong>${d.source.id}</strong> ↔ <strong>${d.target.id}</strong>
                    </div>
                    <div style="font-size: 16px; color: ${d.value < 0 ? '#d32f2f' : '#1976d2'};">
                        Correlation: ${d.value.toFixed(3)}
                    </div>
                    <div style="font-size: 12px; color: #666; margin-top: 5px;">
                        ${Math.abs(d.value) > 0.7 ? 'Strong' : Math.abs(d.value) > 0.4 ? 'Moderate' : 'Weak'} 
                        ${d.value < 0 ? 'Negative' : 'Positive'} Correlation
                    </div>
                </div>
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');

        // Highlight the edge and connected nodes
        d3.select(this)
            .attr('stroke-opacity', 1)
            .attr('stroke-width', d => edgeScale(Math.abs(d.value)) * 2);
    })
    .on('mouseout', function(event, d) {
        // Hide tooltip
        d3.select('#tooltip').style('visibility', 'hidden');

        // Reset edge style
        d3.select(this)
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', d => edgeScale(Math.abs(d.value)));
    });

    // Update simulation
    simulation.nodes(nodes);
    simulation.force('link').links(edges);
    
    simulation.on('tick', () => {
        links
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        nodes_g
            .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Add legend with more space
    const legend = svg.append('g')
        .attr('transform', `translate(20, 20)`);

    // Feature type legend
    const featureTypes = [
        { type: 'Musical Characteristics', color: nodeColors.musical },
        { type: 'Technical Features', color: nodeColors.technical }
    ];

    const legendItems = legend.selectAll('.legend-item')
        .data(featureTypes)
        .join('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 30})`);  // Increased spacing from 25 to 30

    legendItems.append('circle')
        .attr('r', 6)
        .attr('fill', d => d.color);

    legendItems.append('text')
        .attr('x', 15)
        .attr('y', 5)
        .style('font-size', '14px')  // Increased font size
        .text(d => d.type);

    // Correlation legend with more space
    const correlationLegend = svg.append('g')
        .attr('transform', `translate(${width - 250}, 20)`);  // Moved left by 50px

    const correlationTypes = [
        { label: 'Strong Negative', value: -0.7, color: '#ff0000' },
        { label: 'Moderate Negative', value: -0.4, color: '#ff0000' },
        { label: 'Moderate Positive', value: 0.4, color: '#0000ff' },
        { label: 'Strong Positive', value: 0.7, color: '#0000ff' }
    ];

    const correlationItems = correlationLegend.selectAll('.correlation-item')
        .data(correlationTypes)
        .join('g')
        .attr('class', 'correlation-item')
        .attr('transform', (d, i) => `translate(0, ${i * 30})`);  // Increased spacing from 25 to 30

    correlationItems.append('line')
        .attr('x1', 0)
        .attr('y1', 5)
        .attr('x2', 40)  // Increased line length from 30 to 40
        .attr('y2', 5)
        .attr('stroke', d => d.color)
        .attr('stroke-width', d => edgeScale(Math.abs(d.value)));

    correlationItems.append('text')
        .attr('x', 50)  // Increased spacing from 40 to 50
        .attr('y', 9)
        .style('font-size', '14px')  // Increased font size
        .text(d => d.label);
}

// Update drag functions to use the global simulation
function dragstarted(event, d) {
    if (!event.active && simulation) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragended(event, d) {
    if (!event.active && simulation) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
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
            processed.genre = d.track_genre || 'Unknown';  // Changed from genre to track_genre
            return processed;
        });

        // Get unique genres for the filter
        const genres = ['All', ...new Set(processedData.map(d => d.genre))].sort();  // Added sort()
        
        // Set up genre filter
        const genreSelect = d3.select('#genre-filter')
            .selectAll('option')
            .data(genres)
            .join('option')
            .attr('value', d => d)
            .text(d => d);

        // Set up filter change listeners
        d3.select('#platform-filter').on('change', updateFilters);
        d3.select('#genre-filter').on('change', updateFilters);

        function updateFilters() {
            const platforms = +d3.select('#platform-filter').property('value');
            const genre = d3.select('#genre-filter').property('value');
            updateVisualization(platforms, genre);
        }

        // Initial visualization
        updateVisualization(0, 'All');
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