// Define feature groups
const musicalCharacteristics = [
    'danceability', 'energy', 'loudness', 'speechiness',
    'acousticness', 'instrumentalness', 'liveness', 'valence', 'time_signature'
];

const technicalFeatures = [
    'spectral_centroid', 'spectral_bandwidth', 'spectral_rolloff',
    'zero_crossing_rate', 'chroma_stft', 'beat_strength',
    'harmonic_percussive', 'speech_to_music_ratio', 'tempogram'
];

// All features combined
const features = [...musicalCharacteristics, ...technicalFeatures];

// Color scales
const groupColors = {
    'musical': '#2ecc71',
    'technical': '#9b59b6'
};

const correlationColors = d3.scaleLinear()
    .domain([-1, 0, 1])
    .range(['#e74c3c', '#fff', '#3498db']);

// Set up the chord diagram dimensions
const width = 800;
const height = 800;
const innerRadius = Math.min(width, height) * 0.4;
const outerRadius = innerRadius * 1.1;

// Create the SVG container
const svg = d3.select('#chord-diagram')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width/2},${height/2})`);

// Load and process the data
d3.csv('processed_data.csv')
    .then(data => {
        console.log('Data loaded:', data.length, 'rows');
        console.log('Sample row:', data[0]);
        console.log('Available columns:', Object.keys(data[0]));
        
        if (!data.length) {
            throw new Error('No data loaded');
        }

        // Check if required columns exist
        const missingColumns = features.filter(f => !(f in data[0]));
        if (missingColumns.length > 0) {
            throw new Error('Missing columns: ' + missingColumns.join(', '));
        }

        if (!('hitPlatforms' in data[0])) {
            throw new Error('Missing hitPlatforms column');
        }
        
        // Process the data to ensure all features are numeric
        const processedData = data.map(d => {
            const processed = {};
            features.forEach(feature => {
                const value = +d[feature];
                if (isNaN(value)) {
                    console.warn(`Invalid value for ${feature}:`, d[feature]);
                }
                processed[feature] = value || 0;
            });
            processed.hitPlatforms = +d.hitPlatforms || 0;
            return processed;
        });
        
        // Filter for hit songs (success on 5 or more platforms)
        const hitSongs = processedData.filter(d => d.hitPlatforms >= 5);
        console.log('Hit songs:', hitSongs.length);
        
        if (hitSongs.length === 0) {
            throw new Error('No hit songs found in the data');
        }
        
        // Calculate correlation matrix
        const matrix = calculateCorrelationMatrix(hitSongs, features);
        console.log('Correlation matrix calculated:', matrix);
        
        // Create chord layout
        const chord = d3.chordDirected()
            .padAngle(0.05)
            .sortSubgroups(d3.descending)
            (matrix);

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
            .attr('d', d3.arc()
                .innerRadius(innerRadius)
                .outerRadius(outerRadius)
            );

        // Add labels
        group.append('text')
            .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
            .attr('dy', '.35em')
            .attr('transform', d => `
                rotate(${(d.angle * 180 / Math.PI - 90)})
                translate(${outerRadius + 10})
                ${d.angle > Math.PI ? 'rotate(180)' : ''}
            `)
            .attr('text-anchor', d => d.angle > Math.PI ? 'end' : 'start')
            .text(d => features[d.index])
            .style('font-size', '12px')
            .style('fill', d => {
                const featureName = features[d.index];
                return musicalCharacteristics.includes(featureName) ? groupColors.musical : groupColors.technical;
            });

        // Add the chords
        svg.append('g')
            .attr('fill-opacity', 0.75)
            .selectAll('path')
            .data(chord)
            .join('path')
            .attr('d', d3.ribbon()
                .radius(innerRadius)
            )
            .attr('fill', d => correlationColors(matrix[d.source.index][d.target.index]))
            .attr('stroke', d => d3.rgb(correlationColors(matrix[d.source.index][d.target.index])).darker());

        // Add mouseover interactions
        const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background-color', 'white')
            .style('padding', '5px')
            .style('border', '1px solid #ddd')
            .style('border-radius', '4px');

        svg.selectAll('path')
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .attr('fill-opacity', 1);
                
                if (d.source) {  // Chord
                    const correlation = matrix[d.source.index][d.target.index];
                    tooltip.html(`
                        ${features[d.source.index]} → ${features[d.target.index]}<br>
                        Correlation: ${correlation.toFixed(3)}
                    `)
                    .style('visibility', 'visible')
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
                }
            })
            .on('mouseout', function() {
                d3.select(this)
                    .attr('fill-opacity', 0.75);
                tooltip.style('visibility', 'hidden');
            });
    });

// Function to calculate correlation matrix
function calculateCorrelationMatrix(data, features) {
    const n = features.length;
    const matrix = Array(n).fill().map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) {
                matrix[i][j] = 1;
                continue;
            }
            
            const feature1 = features[i];
            const feature2 = features[j];
            
            // Extract values for both features
            const values1 = data.map(d => d[feature1]).filter(v => !isNaN(v));
            const values2 = data.map(d => d[feature2]).filter(v => !isNaN(v));
            
            // Calculate correlation
            const correlation = calculateCorrelation(values1, values2);
            matrix[i][j] = correlation;
        }
    }
    
    return matrix;
}

// Function to calculate correlation between two arrays
function calculateCorrelation(x, y) {
    const n = Math.min(x.length, y.length);
    
    // Calculate means
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;
    
    // Calculate covariance and standard deviations
    let covariance = 0;
    let xStdDev = 0;
    let yStdDev = 0;
    
    for (let i = 0; i < n; i++) {
        const xDiff = x[i] - xMean;
        const yDiff = y[i] - yMean;
        covariance += xDiff * yDiff;
        xStdDev += xDiff * xDiff;
        yStdDev += yDiff * yDiff;
    }
    
    xStdDev = Math.sqrt(xStdDev / n);
    yStdDev = Math.sqrt(yStdDev / n);
    
    // Return correlation coefficient
    return covariance / (n * xStdDev * yStdDev);
}