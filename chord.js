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

// Color scales
const groupColors = {
    'musical': '#2ecc71',  // Bright green
    'technical': '#9b59b6'  // Purple
};

const correlationColors = d3.scaleLinear()
    .domain([-1, -0.5, 0, 0.5, 1])
    .range(['#e74c3c', '#f39c12', '#ecf0f1', '#3498db', '#2980b9']);  // Red -> Orange -> White -> Light Blue -> Dark Blue

// Set up the chord diagram dimensions
const width = 900;  // Slightly larger
const height = 900;
const innerRadius = Math.min(width, height) * 0.35;  // Slightly smaller inner radius
const outerRadius = innerRadius * 1.15;  // Slightly larger outer radius

// Create the SVG container
const svg = d3.select('#chord-diagram')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width/2},${height/2})`);

// Create tooltip
const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background-color', 'white')
    .style('padding', '8px')
    .style('border', '1px solid #ddd')
    .style('border-radius', '4px')
    .style('font-size', '12px')
    .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)');

// Load and process the data
fetch('https://raw.githubusercontent.com/aliciatay/CS5346/main/final_df_cleaned.csv')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
    })
    .then(csvText => {
        console.log('CSV text received, length:', csvText.length);
        const data = d3.csvParse(csvText);
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
            // Count platforms where the song is a hit
            const platforms = ['Spotify_Hit', 'YouTube_Hit', 'TikTok_Hit', 'Deezer_Hit', 'Amazon_Hit'];
            processed.hitPlatforms = platforms.filter(platform => d[platform] === 'True').length;
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
        const chord = d3.chordDirected()  // Use chordDirected for better control
            .padAngle(0.04)
            .sortSubgroups(d3.descending)
            .sortChords(d3.descending)  // Sort chords by size
            (matrix);

        // Add the groups
        const group = svg.append('g')
            .attr('class', 'groups')
            .selectAll('g')
            .data(chord.groups)
            .join('g');

        // Draw the outer arcs
        group.append('path')
            .attr('fill', d => {
                const featureName = features[d.index];
                return musicalCharacteristics.includes(featureName) ? groupColors.musical : groupColors.technical;
            })
            .attr('stroke', '#fff')  // Add white stroke for better separation
            .attr('d', d3.arc()
                .innerRadius(innerRadius)
                .outerRadius(outerRadius)
            );

        // Add labels with better positioning
        group.append('text')
            .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
            .attr('dy', '.35em')
            .attr('transform', d => {
                const rotation = (d.angle * 180 / Math.PI - 90);
                const translation = outerRadius + 10;
                return `
                    rotate(${rotation})
                    translate(${translation})
                    ${d.angle > Math.PI ? 'rotate(180)' : ''}
                `;
            })
            .attr('text-anchor', d => d.angle > Math.PI ? 'end' : 'start')
            .text(d => features[d.index])
            .style('font-size', '10px')  // Smaller font size
            .style('fill', d => {
                const featureName = features[d.index];
                return musicalCharacteristics.includes(featureName) ? groupColors.musical : groupColors.technical;
            });

        // Add the chords with better styling
        const chords = svg.append('g')
            .attr('class', 'chords')
            .selectAll('path')
            .data(chord)
            .join('path')
            .attr('d', d3.ribbon()
                .radius(innerRadius)
            )
            .attr('fill', d => correlationColors(matrix[d.source.index][d.target.index]))
            .attr('stroke', '#fff')  // Add white stroke
            .attr('stroke-width', 0.5)
            .attr('fill-opacity', 0.67);  // Slightly more transparent

        // Enhanced mouseover interactions
        chords.on('mouseover', function(event, d) {
            const correlation = matrix[d.source.index][d.target.index];
            
            // Highlight the current chord
            d3.select(this)
                .attr('fill-opacity', 1)
                .attr('stroke-width', 2);
            
            // Show tooltip with more information
            tooltip.html(`
                <strong>${features[d.source.index]} → ${features[d.target.index]}</strong><br>
                Correlation: ${correlation.toFixed(3)}
            `)
            .style('visibility', 'visible')
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            // Reset chord appearance
            d3.select(this)
                .attr('fill-opacity', 0.67)
                .attr('stroke-width', 0.5);
            
            tooltip.style('visibility', 'hidden');
        });
    })
    .catch(error => {
        console.error('Error loading or processing data:', error);
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('error-message').innerText = `Error: ${error.message}`;
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