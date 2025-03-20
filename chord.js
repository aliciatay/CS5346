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

// All features combined
const features = [...musicalCharacteristics, ...technicalFeatures];

// Set up the chord diagram dimensions
const width = 1000;
const height = 1000;
const innerRadius = Math.min(width, height) * 0.35;
const outerRadius = innerRadius * 1.1;

// Create color scales
const groupColors = {
    'musical': '#ff9999',  // Light red for Musical Characteristics
    'technical': '#99ccff'  // Light blue for Technical Features
};

const correlationColors = d3.scaleSequential()
    .domain([-1, 1])
    .interpolator(d3.interpolateRdBu);

// Create SVG container
const svg = d3.select('#chord-diagram')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width/2},${height/2})`);

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

    // Calculate correlation matrix
    const matrix = Array(features.length).fill().map(() => Array(features.length).fill(0));
    
    for (let i = 0; i < features.length; i++) {
        for (let j = 0; j < features.length; j++) {
            const values1 = filteredData.map(d => d[features[i]]);
            const values2 = filteredData.map(d => d[features[j]]);
            matrix[i][j] = calculateCorrelation(values1, values2);
        }
    }

    // Create chord layout
    const chord = d3.chord()
        .padAngle(0.02)
        .sortSubgroups((a, b) => Math.abs(b) - Math.abs(a))
        .sortChords((a, b) => Math.abs(b.source.value) - Math.abs(a.source.value))
        .threshold(0.3)  // Only show correlations stronger than 0.3
        (matrix);

    // Clear previous visualization
    svg.selectAll('*').remove();

    // Add the groups
    const group = svg.append('g')
        .selectAll('g')
        .data(chord.groups)
        .join('g');

    // Draw the outer arcs
    group.append('path')
        .attr('fill', d => {
            const featureName = features[d.index];
            return musicalCharacteristics.includes(featureName) ? groupColors.musical : groupColors.technical;
        })
        .attr('stroke', '#fff')
        .attr('d', d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius)
        );

    // Add labels
    group.append('text')
        .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
        .attr('dy', '.35em')
        .attr('transform', d => {
            const rotation = (d.angle * 180 / Math.PI - 90);
            const translation = outerRadius + 10;
            return `
                rotate(${rotation})
                translate(${translation},0)
                ${d.angle > Math.PI ? 'rotate(180)' : ''}
            `;
        })
        .attr('text-anchor', d => d.angle > Math.PI ? 'end' : 'start')
        .text(d => features[d.index])
        .style('font-size', '12px')
        .style('font-weight', 'bold');

    // Add the chords
    const chords = svg.append('g')
        .attr('fill-opacity', 0.75)
        .selectAll('path')
        .data(chord)
        .join('path')
        .attr('d', d3.ribbon()
            .radius(innerRadius)
        )
        .attr('fill', d => {
            const correlation = matrix[d.source.index][d.target.index];
            return correlationColors(correlation);
        });

    // Add mouseover interactions
    chords
        .on('mouseover', function(event, d) {
            const correlation = matrix[d.source.index][d.target.index];
            
            // Highlight chord
            d3.select(this)
                .attr('fill-opacity', 1)
                .attr('stroke', '#000')
                .attr('stroke-width', 2);
            
            // Show tooltip
            const tooltip = d3.select('#tooltip');
            tooltip.style('visibility', 'visible')
                .html(`
                    <div style="background: white; padding: 10px; border: 2px solid #333; border-radius: 5px;">
                        <div style="font-size: 14px; margin-bottom: 5px;">
                            <strong>${features[d.source.index]}</strong> ↔ <strong>${features[d.target.index]}</strong>
                        </div>
                        <div style="font-size: 16px; color: ${correlation < 0 ? '#d32f2f' : '#1976d2'};">
                            Correlation: ${correlation.toFixed(3)}
                        </div>
                        <div style="font-size: 12px; color: #666; margin-top: 5px;">
                            ${Math.abs(correlation) > 0.7 ? 'Strong' : Math.abs(correlation) > 0.4 ? 'Moderate' : 'Weak'} 
                            ${correlation < 0 ? 'Negative' : 'Positive'} Correlation
                        </div>
                    </div>
                `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            // Reset chord appearance
            d3.select(this)
                .attr('fill-opacity', 0.75)
                .attr('stroke', null);
            
            // Hide tooltip
            d3.select('#tooltip').style('visibility', 'hidden');
        });

    // Add legend for feature types
    const legendGroup = svg.append('g')
        .attr('transform', `translate(${-width/2 + 50}, ${-height/2 + 50})`);

    // Feature type legend
    const featureTypes = [
        { type: 'Musical Characteristics', color: groupColors.musical },
        { type: 'Technical Features', color: groupColors.technical }
    ];

    const legendItems = legendGroup.selectAll('.legend-item')
        .data(featureTypes)
        .join('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 25})`);

    legendItems.append('rect')
        .attr('width', 18)
        .attr('height', 18)
        .attr('fill', d => d.color);

    legendItems.append('text')
        .attr('x', 24)
        .attr('y', 9)
        .attr('dy', '.35em')
        .text(d => d.type);

    // Correlation strength legend
    const correlationLegend = svg.append('g')
        .attr('transform', `translate(${width/2 - 250}, ${-height/2 + 50})`);

    const correlationTypes = [
        { label: 'Strong Negative', value: -0.7 },
        { label: 'Moderate Negative', value: -0.4 },
        { label: 'Weak/No Correlation', value: 0 },
        { label: 'Moderate Positive', value: 0.4 },
        { label: 'Strong Positive', value: 0.7 }
    ];

    const correlationItems = correlationLegend.selectAll('.correlation-item')
        .data(correlationTypes)
        .join('g')
        .attr('class', 'correlation-item')
        .attr('transform', (d, i) => `translate(0, ${i * 25})`);

    correlationItems.append('rect')
        .attr('width', 18)
        .attr('height', 18)
        .attr('fill', d => correlationColors(d.value));

    correlationItems.append('text')
        .attr('x', 24)
        .attr('y', 9)
        .attr('dy', '.35em')
        .text(d => d.label);
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