// Platform metrics definition
const platformMetrics = {
    'Spotify': true,
    'YouTube': true,
    'TikTok': true,
    'Apple Music': true,
    'Deezer': true,
    'SiriusXM': true,
    'Amazon': true,
    'Pandora': true,
    'Shazam': true
};

// Features to display with nice labels
const musicalCharacteristics = {
    'danceability': 'Danceability',
    'energy': 'Energy',
    'key': 'Key',
    'loudness': 'Loudness',
    'speechiness': 'Speechiness',
    'acousticness': 'Acousticness',
    'instrumentalness': 'Instrumentalness',
    'liveness': 'Liveness',
    'valence': 'Valence',
    'time_signature': 'Time Signature'
};

const technicalFeatures = {
    'spectral_centroid': 'Spectral Centroid',
    'spectral_bandwidth': 'Spectral Bandwidth',
    'spectral_rolloff': 'Spectral Rolloff',
    'zero_crossing_rate': 'Zero Crossing Rate',
    'chroma_stft': 'Chroma STFT',
    'beat_strength': 'Beat Strength',
    'harmonic_to_percussive_ratio': 'Harmonic/Percussive Ratio',
    'speech_to_music_ratio': 'Speech/Music Ratio',
    'tempogram': 'Tempogram'
};

const featureCategories = {
    'Musical Characteristics': musicalCharacteristics,
    'Technical Features': technicalFeatures
};

const allFeatures = {
    ...musicalCharacteristics,
    ...technicalFeatures
};

const features = Object.keys(allFeatures);

// Color scheme
const colors = {
    hits: {
        fill: 'rgba(255, 99, 132, 0.5)',
        stroke: 'rgb(255, 99, 132)',
        highlight: 'rgb(255, 99, 132)'
    },
    nonHits: {
        fill: 'rgba(54, 162, 235, 0.5)',
        stroke: 'rgb(54, 162, 235)',
        highlight: 'rgb(54, 162, 235)'
    },
    categories: {
        'Musical Characteristics': '#2ecc71',
        'Technical Features': '#9b59b6'
    }
};

// Radar chart configuration
const config = {
    width: 700,
    height: 700,
    margin: 150,
    levels: 5,
    maxValue: 1,
    labelFactor: 1.35,
    wrapWidth: 100,
    dotRadius: 8,      // Increased dot size further
    strokeWidth: 3
};

// Initialize the chart structure
function initializeChart() {
    // Clear existing content
    d3.select('#radar-chart').html('');

    const svg = d3.select('#radar-chart')
        .append('svg')
        .attr('width', config.width + config.margin * 2)
        .attr('height', config.height + config.margin * 2)
        .attr('class', 'radar-chart');

    const g = svg.append('g')
        .attr('transform', `translate(${config.width/2 + config.margin},${config.height/2 + config.margin})`);

    const radius = Math.min(config.width/2, config.height/2);
    const angleSlice = Math.PI * 2 / features.length;

    // Draw grid
    const axisGrid = g.append('g').attr('class', 'axis-grid');
    
    // Draw axes
    features.forEach((feature, i) => {
        // Draw axis line
        axisGrid.append('line')
            .attr('class', 'axis-line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', radius * Math.cos(angleSlice * i - Math.PI/2))
            .attr('y2', radius * Math.sin(angleSlice * i - Math.PI/2))
            .style('stroke', '#e0e0e0')
            .style('stroke-width', '2px');

        // Add label
        const labelX = radius * config.labelFactor * Math.cos(angleSlice * i - Math.PI/2);
        const labelY = radius * config.labelFactor * Math.sin(angleSlice * i - Math.PI/2);
        
        axisGrid.append('text')
            .attr('class', 'axis-label')
            .attr('x', labelX)
            .attr('y', labelY)
            .style('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('fill', '#333')
            .text(allFeatures[feature]);
    });

    // Draw circular levels
    for (let j = 0; j < config.levels; j++) {
        const levelFactor = radius * ((j + 1) / config.levels);
        
        // Draw level circles
        axisGrid.append('circle')
            .attr('class', 'grid-circle')
            .attr('r', levelFactor)
            .style('fill', 'none')
            .style('stroke', '#f0f0f0')
            .style('stroke-width', '1.5px')
            .style('stroke-dasharray', '4,4');

        // Add level values
        axisGrid.append('text')
            .attr('class', 'level-label')
            .attr('x', 4)
            .attr('y', -levelFactor)
            .style('font-size', '12px')
            .style('fill', '#666')
            .text(((j + 1) * config.maxValue / config.levels).toFixed(1));
    }

    return { svg, g, radius, angleSlice };
}

// Load and process data
async function loadData() {
    try {
        const response = await fetch('final_df_cleaned.csv');
        const text = await response.text();
        const rows = d3.csvParse(text);
        
        console.log('Loaded', rows.length, 'records');
        
        // Process data
        const processedData = rows.map(d => ({
            year: new Date(d['Release Date']).getFullYear(),
            genre: d.track_genre,
            features: features.reduce((obj, feature) => {
                obj[feature] = +d[feature];
                // Normalize values between 0 and 1
                if (feature === 'loudness') {
                    obj[feature] = (+d[feature] + 60) / 60;
                } else if (feature === 'key') {
                    obj[feature] = +d[feature] / 11;  // Keys are 0-11
                } else if (feature === 'time_signature') {
                    obj[feature] = +d[feature] / 7;  // Assuming max time signature of 7
                } else if (feature === 'spectral_centroid' || feature === 'spectral_bandwidth' || feature === 'spectral_rolloff') {
                    // Normalize spectral features by their typical ranges
                    obj[feature] = Math.min(1, +d[feature] / 10000);
                } else if (feature === 'zero_crossing_rate' || feature === 'chroma_stft' || feature === 'beat_strength') {
                    // These features are already between 0 and 1
                    obj[feature] = Math.min(1, Math.max(0, +d[feature]));
                } else if (feature === 'harmonic_to_percussive_ratio' || feature === 'speech_to_music_ratio' || feature === 'tempogram') {
                    // Normalize ratio features
                    obj[feature] = Math.min(1, +d[feature]);
                }
                return obj;
            }, {}),
            hitPlatforms: Object.keys(platformMetrics).filter(platform => d[`${platform}_Hit`] === 'True').length
        }));

        // Find min and max years from actual data
        const minYear = d3.min(processedData, d => d.year);
        const maxYear = d3.max(processedData, d => d.year);

        // Update the year slider
        const yearSlider = d3.select('#year-slider')
            .attr('min', minYear)
            .attr('max', maxYear)
            .attr('value', maxYear);

        // Update the year display
        d3.select('#year-value').text(maxYear);

        return processedData;
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

// Update visualization
function updateVisualization(data, year, genre) {
    console.log('Updating visualization with:', {
        year: year,
        genre: genre,
        totalDataPoints: data.length
    });
    
    // Filter data based on year and genre
    let filteredData = data;
    
    if (!d3.select('#all-time-checkbox').property('checked')) {
        filteredData = data.filter(d => d.year <= year);
    }
    
    if (genre !== 'all') {
        filteredData = filteredData.filter(d => d.genre.toLowerCase() === genre.toLowerCase());
    }

    console.log('Filtered data points:', filteredData.length);

    if (filteredData.length === 0) {
        d3.select('#no-data').style('display', 'block');
        d3.selectAll('.viz-section').style('display', 'none');
        return;
    }

    d3.select('#no-data').style('display', 'none');
    d3.selectAll('.viz-section').style('display', 'block');

    // Split into hits and non-hits
    const hits = filteredData.filter(d => d.hitPlatforms >= 5);
    const nonHits = filteredData.filter(d => d.hitPlatforms < 5);

    // Calculate averages for each feature
    const hitsAvg = features.map(feature => ({
        feature,
        value: d3.mean(hits, d => d.features[feature])
    }));

    const nonHitsAvg = features.map(feature => ({
        feature,
        value: d3.mean(nonHits, d => d.features[feature])
    }));

    // Update radar chart with averaged values
    updateRadarChart(hitsAvg, nonHitsAvg);
}

// Update the radar chart drawing function
function updateRadarChart(hitsAvg, nonHitsAvg) {
    const { svg, g, radius, angleSlice } = initializeChart();

    // Scale for data - ensure all values are between 0 and 1
    const rScale = d3.scaleLinear()
        .domain([0, 1])
        .range([0, radius]);

    // Draw paths
    const radarLine = d3.lineRadial()
        .curve(d3.curveLinearClosed)
        .radius(d => rScale(Math.min(1, Math.max(0, d.value || 0))))
        .angle((d, i) => i * angleSlice);

    // Draw hits path
    g.append('path')
        .datum(hitsAvg)
        .attr('class', 'radar-area hits')
        .attr('d', radarLine)
        .style('fill', colors.hits.fill)
        .style('stroke', colors.hits.stroke)
        .style('stroke-width', config.strokeWidth + 'px');

    // Draw non-hits path
    g.append('path')
        .datum(nonHitsAvg)
        .attr('class', 'radar-area non-hits')
        .attr('d', radarLine)
        .style('fill', colors.nonHits.fill)
        .style('stroke', colors.nonHits.stroke)
        .style('stroke-width', config.strokeWidth + 'px');

    // Update legend position and size
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${config.width + config.margin - 150}, 50)`);

    ['Hits', 'Non-Hits'].forEach((label, i) => {
        const color = label === 'Hits' ? colors.hits : colors.nonHits;
        const group = legend.append('g')
            .attr('transform', `translate(0, ${i * 30})`);

        group.append('rect')
            .attr('width', 20)
            .attr('height', 20)
            .style('fill', color.fill)
            .style('stroke', color.stroke);

        group.append('text')
            .attr('x', 30)
            .attr('y', 15)
            .style('font-size', '14px')
            .text(label);
    });

    // Add data points with proper tooltips
    const pointsGroup = g.append('g').attr('class', 'points-group');

    // Function to add points
    const addPoints = (data, color) => {
        data.forEach((d, i) => {
            const value = Math.min(1, Math.max(0, d.value || 0));
            const x = rScale(value) * Math.cos(angleSlice * i - Math.PI/2);
            const y = rScale(value) * Math.sin(angleSlice * i - Math.PI/2);

            pointsGroup.append('circle')
                .attr('cx', x)
                .attr('cy', y)
                .attr('r', config.dotRadius)
                .style('fill', color.fill)
                .style('stroke', color.stroke)
                .style('stroke-width', '2px')
                .on('mouseover', function() {
                    const tooltip = pointsGroup.append('text')
                        .attr('class', 'point-label')
                        .attr('x', x)
                        .attr('y', y - 15)
                        .style('text-anchor', 'middle')
                        .style('fill', color.stroke)
                        .style('font-size', '12px')
                        .text(`${allFeatures[d.feature]}: ${d.value.toFixed(3)}`);
                })
                .on('mouseout', function() {
                    pointsGroup.selectAll('.point-label').remove();
                });
        });
    };

    addPoints(hitsAvg, colors.hits);
    addPoints(nonHitsAvg, colors.nonHits);
}

// Initialize the visualization
loadData().then(data => {
    // Get unique genres and capitalize first letter
    const genres = ['All', ...new Set(data.map(d => {
        // Capitalize first letter of each word
        return d.genre.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }))].sort();
    
    // Remove duplicate 'All' if it exists
    const uniqueGenres = [...new Set(genres)];
    
    // Populate genre selector
    const genreSelector = d3.select('#genre-selector');
    genreSelector.html(''); // Clear existing options
    genreSelector.selectAll('option')
        .data(uniqueGenres)
        .enter()
        .append('option')
        .text(d => d)
        .attr('value', d => d.toLowerCase());

    // Add event listeners
    d3.select('#year-slider').on('input', function() {
        const year = +this.value;
        d3.select('#year-value').text(year);
        updateVisualization(data, year, d3.select('#genre-selector').property('value'));
    });

    d3.select('#genre-selector').on('change', function() {
        updateVisualization(data, +d3.select('#year-slider').property('value'), this.value);
    });

    d3.select('#threshold-selector').on('change', function() {
        console.log('Threshold changed to:', this.value);
        updateVisualization(data, +d3.select('#year-slider').property('value'), d3.select('#genre-selector').property('value'));
    });

    // Add All Time checkbox listener
    d3.select('#all-time-checkbox').on('change', function() {
        const yearSlider = d3.select('#year-slider');
        const yearValue = d3.select('#year-value');
        const isChecked = this.checked;
        
        console.log('All Time checkbox changed:', isChecked);
        
        if (isChecked) {
            yearSlider.property('disabled', true);
            yearValue.text('All Time');
        } else {
            yearSlider.property('disabled', false);
            const currentYear = yearSlider.property('value');
            yearValue.text(currentYear);
        }
        
        // Always update with current year value, the updateVisualization function will handle All Time logic
        updateVisualization(data, +yearSlider.property('value'), d3.select('#genre-selector').property('value'));
    });

    // Initial visualization
    const maxYear = d3.max(data, d => d.year);
    console.log('Initial visualization with max year:', maxYear);
    updateVisualization(data, maxYear, 'all');
}).catch(error => {
    console.error('Error:', error);
    d3.select('#no-data')
        .style('display', 'block')
        .text('Error loading data. Please check the console for details.');
});