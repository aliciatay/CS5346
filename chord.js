// Feature groups definition
const featureGroups = {
    musical: ['danceability', 'energy', 'valence', 'acousticness', 'loudness', 'speechiness', 'instrumentalness', 'liveness'],
    technical: [
        'duration_ms', 
        'time_signature', 
        'key',
        'mean_mfcc',           // Average of all MFCC features
        'tempogram',           // Rhythm/tempo variation
        'speech_to_music',     // Speech to music ratio
        'harmonic_percussion', // Harmonic to percussion ratio
        'beat_strength',       // Beat strength
        'chroma_stft'         // Harmonic content
    ]
};

// Nice labels for features
const featureLabels = {
    // Musical characteristics
    'danceability': 'Danceability',
    'energy': 'Energy',
    'valence': 'Valence',
    'acousticness': 'Acousticness',
    'loudness': 'Loudness',
    'speechiness': 'Speechiness',
    'instrumentalness': 'Instrumentalness',
    'liveness': 'Liveness',
    // Technical features
    'duration_ms': 'Duration',
    'time_signature': 'Time Sig',
    'key': 'Key',
    'mean_mfcc': 'MFCC Mean',
    'tempogram': 'Tempogram',
    'speech_to_music': 'Speech/Music',
    'harmonic_percussion': 'Harm/Perc',
    'beat_strength': 'Beat Str',
    'chroma_stft': 'Chroma'
};

// Color scales for the two feature groups
const colorScale = d3.scaleOrdinal()
    .domain(['musical', 'technical'])
    .range(['#ff9999', '#99ccff']);

// Function to calculate correlation coefficient
function correlationCoefficient(x, y) {
    // Filter out any NaN or null values
    const validPairs = x.map((xi, i) => [xi, y[i]])
                       .filter(pair => !isNaN(pair[0]) && !isNaN(pair[1]) &&
                                     pair[0] !== null && pair[1] !== null);
    
    if (validPairs.length < 2) return 0;
    
    const n = validPairs.length;
    const [xFiltered, yFiltered] = validPairs.reduce(
        ([xAcc, yAcc], [xi, yi]) => [[...xAcc, xi], [...yAcc, yi]],
        [[], []]
    );

    const sum_x = xFiltered.reduce((a, b) => a + b, 0);
    const sum_y = yFiltered.reduce((a, b) => a + b, 0);
    const sum_xy = xFiltered.reduce((total, xi, i) => total + xi * yFiltered[i], 0);
    const sum_x2 = xFiltered.reduce((total, xi) => total + xi * xi, 0);
    const sum_y2 = yFiltered.reduce((total, yi) => total + yi * yi, 0);

    const correlation = (n * sum_xy - sum_x * sum_y) /
        Math.sqrt((n * sum_x2 - sum_x * sum_x) * (n * sum_y2 - sum_y * sum_y));

    return isNaN(correlation) ? 0 : correlation;
}

// Function to calculate the correlation matrix
function calculateCorrelationMatrix(data, features) {
    const matrix = [];
    const n = features.length;
    
    for (let i = 0; i < n; i++) {
        matrix[i] = [];
        for (let j = 0; j < n; j++) {
            if (i === j) {
                matrix[i][j] = 0;
            } else {
                const feature1 = features[i];
                const feature2 = features[j];
                const values1 = data.map(d => d.features[feature1]);
                const values2 = data.map(d => d.features[feature2]);
                matrix[i][j] = Math.abs(correlationCoefficient(values1, values2));
            }
        }
    }
    
    return matrix;
}

// Load and process data
async function loadData() {
    try {
        const response = await fetch('final_df_cleaned.csv');
        const text = await response.text();
        const rows = d3.csvParse(text);
        
        console.log('Loaded', rows.length, 'records');
        console.log('Sample row columns:', Object.keys(rows[0]));
        
        // Process data
        const processedData = rows.map(d => ({
            year: new Date(d['Release Date']).getFullYear(),
            genre: d.track_genre,
            streams: +d['Spotify Streams'],
            playlists: +d['Spotify Playlist Count'],
            features: {
                // Musical characteristics
                danceability: +d.danceability,
                energy: +d.energy,
                valence: +d.valence,
                acousticness: +d.acousticness,
                loudness: (+d.loudness + 60) / 60, // Normalize to 0-1
                speechiness: +d.speechiness,
                instrumentalness: +d.instrumentalness,
                liveness: +d.liveness,
                // Technical features
                duration_ms: Math.min(+d.duration_ms / (10 * 60 * 1000), 1),
                time_signature: (+d.time_signature - 3) / 4,
                key: +d.key / 11,
                // Calculate mean of MFCC features (columns that start with 'mfcc')
                mean_mfcc: d3.mean(
                    Object.entries(d)
                        .filter(([key]) => key.startsWith('mfcc'))
                        .map(([_, value]) => +value)
                ),
                tempogram: +d.tempogram_mean || 0,
                speech_to_music: +d.speech_to_music_ratio || 0,
                harmonic_percussion: +d.harmonic_to_percussive_ratio || 0,
                beat_strength: +d.beat_strength || 0,
                chroma_stft: +d.chroma_stft || 0
            }
        }));

        // Log first row features and their values for debugging
        console.log('First row MFCC features:', 
            Object.entries(rows[0])
                .filter(([key]) => key.startsWith('mfcc'))
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
        );
        console.log('First row processed features:', processedData[0].features);

        // Normalize the new features to 0-1 range
        const newFeatures = ['mean_mfcc', 'tempogram', 'speech_to_music', 'harmonic_percussion', 'beat_strength', 'chroma_stft'];
        
        newFeatures.forEach(feature => {
            const values = processedData.map(d => d.features[feature]).filter(v => !isNaN(v) && v !== null);
            if (values.length > 0) {
                const min = d3.min(values);
                const max = d3.max(values);
                const range = max - min;
                processedData.forEach(d => {
                    if (!isNaN(d.features[feature]) && d.features[feature] !== null) {
                        d.features[feature] = range === 0 ? 0.5 : (d.features[feature] - min) / range;
                    } else {
                        d.features[feature] = 0;
                    }
                });
            }
        });

        return processedData;
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

// Function to filter data based on genre and threshold
function filterData(data, genre, threshold) {
    let filteredData = [...data];
    
    if (genre !== 'all') {
        // Case-insensitive genre matching
        filteredData = filteredData.filter(d => 
            d.genre.toLowerCase().includes(genre.toLowerCase())
        );
    }

    // Only proceed with threshold filtering if we have data
    if (filteredData.length > 0) {
        const thresholdPercentile = 1 - parseFloat(threshold);
        const streamsArray = filteredData.map(d => d.streams).sort(d3.ascending);
        const playlistArray = filteredData.map(d => d.playlists).sort(d3.ascending);
        
        const streamsThreshold = d3.quantile(streamsArray, thresholdPercentile);
        const playlistThreshold = d3.quantile(playlistArray, thresholdPercentile);
        
        return filteredData.filter(d => 
            d.streams >= streamsThreshold && 
            d.playlists >= playlistThreshold
        );
    }
    
    return filteredData;
}

// Function to draw the chord diagram
function drawChordDiagram(data, genre, threshold) {
    const container = d3.select('#chord-diagram');
    container.html(''); // Clear previous content

    // Filter data and check if we have enough data points
    const filteredData = filterData(data, genre, threshold);
    
    if (filteredData.length < 2) {
        container.append('div')
            .attr('class', 'no-data-message')
            .style('text-align', 'center')
            .style('padding-top', '200px')
            .style('color', '#666')
            .style('font-size', '18px')
            .html(`No sufficient data available for ${genre === 'all' ? 'all genres' : genre} at ${threshold * 100}% threshold.<br>Try adjusting the filters.`);
        return;
    }

    const width = 800;
    const height = 800;
    const innerRadius = Math.min(width, height) * 0.3;
    const outerRadius = innerRadius * 1.1;

    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width/2},${height/2})`);

    // Calculate correlation matrix
    const features = [...featureGroups.musical, ...featureGroups.technical];
    const matrix = calculateCorrelationMatrix(filteredData, features);

    // Create chord layout
    const chord = d3.chord()
        .padAngle(0.05)
        .sortSubgroups(d3.descending)
        (matrix);

    // Create groups
    const group = svg.append('g')
        .selectAll('g')
        .data(chord.groups)
        .join('g');

    // Add arcs for groups
    group.append('path')
        .attr('fill', d => {
            const feature = features[d.index];
            const group = featureGroups.musical.includes(feature) ? 'musical' : 'technical';
            return colorScale(group);
        })
        .attr('d', d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius)
        );

    // Add labels
    group.append('text')
        .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
        .attr('dy', '.35em')
        .attr('class', 'group-label')
        .attr('transform', d => `
            rotate(${(d.angle * 180 / Math.PI - 90)})
            translate(${outerRadius + 10})
            ${d.angle > Math.PI ? 'rotate(180)' : ''}
        `)
        .attr('text-anchor', d => d.angle > Math.PI ? 'end' : 'start')
        .text(d => featureLabels[features[d.index]]);

    // Add chords
    svg.append('g')
        .selectAll('path')
        .data(chord)
        .join('path')
        .attr('d', d3.ribbon()
            .radius(innerRadius)
        )
        .attr('fill', d => {
            const source = features[d.source.index];
            return featureGroups.musical.includes(source) ? colorScale('musical') : colorScale('technical');
        })
        .attr('fill-opacity', d => Math.max(0.1, matrix[d.source.index][d.target.index]))
        .attr('stroke', d => {
            const source = features[d.source.index];
            return d3.rgb(featureGroups.musical.includes(source) ? colorScale('musical') : colorScale('technical')).darker();
        })
        .append('title')
        .text(d => {
            const source = featureLabels[features[d.source.index]];
            const target = featureLabels[features[d.target.index]];
            const correlation = matrix[d.source.index][d.target.index].toFixed(3);
            return `${source} ↔ ${target}\nCorrelation: ${correlation}`;
        });

    // Add Feature Groups Legend
    const featureGroupLegend = svg.append('g')
        .attr('transform', `translate(${width/2 - 250}, ${-height/2 + 40})`);

    featureGroupLegend.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .attr('font-weight', 'bold')
        .text('Feature Groups:');

    const featureGroupData = [
        { group: 'musical', text: 'Musical Characteristics' },
        { group: 'technical', text: 'Technical Audio Features' }
    ];

    const featureGroupItems = featureGroupLegend.selectAll('.feature-group-item')
        .data(featureGroupData)
        .join('g')
        .attr('class', 'feature-group-item')
        .attr('transform', (d, i) => `translate(0, ${i * 25 + 20})`);

    featureGroupItems.append('rect')
        .attr('width', 40)
        .attr('height', 15)
        .attr('fill', d => colorScale(d.group))
        .attr('stroke', 'black')
        .attr('stroke-width', 0.5);

    featureGroupItems.append('text')
        .attr('x', 50)
        .attr('y', 12)
        .text(d => d.text);

    // Add legend for correlation strength
    const legendGroup = svg.append('g')
        .attr('transform', `translate(${-width/2 + 40}, ${-height/2 + 40})`);

    legendGroup.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .attr('font-weight', 'bold')
        .text('Correlation Strength:');

    const legendData = [
        { opacity: 0.1, text: 'Weak (0.1)' },
        { opacity: 0.5, text: 'Medium (0.5)' },
        { opacity: 1.0, text: 'Strong (1.0)' }
    ];

    const legendItems = legendGroup.selectAll('.legend-item')
        .data(legendData)
        .join('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 25 + 20})`);

    legendItems.append('rect')
        .attr('width', 40)
        .attr('height', 15)
        .attr('fill', colorScale('musical'))
        .attr('fill-opacity', d => d.opacity)
        .attr('stroke', 'black')
        .attr('stroke-width', 0.5);

    legendItems.append('text')
        .attr('x', 50)
        .attr('y', 12)
        .text(d => d.text);
}

// Initialize the visualization
loadData().then(data => {
    // Get unique genres and ensure 'All' is first
    const genres = ['All'];
    const otherGenres = [...new Set(data.map(d => {
        return d.genre.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }))].sort();
    
    // Combine 'All' with other genres
    const uniqueGenres = [...genres, ...otherGenres];
    
    // Populate genre selector
    const genreSelector = d3.select('#genre-selector');
    genreSelector.html(''); // Clear existing options
    genreSelector.selectAll('option')
        .data(uniqueGenres)
        .enter()
        .append('option')
        .text(d => d)
        .attr('value', d => d.toLowerCase());

    // Set default value to 'all'
    genreSelector.property('value', 'all');

    // Add event listeners
    d3.select('#genre-selector').on('change', function() {
        drawChordDiagram(
            data,
            this.value,
            d3.select('#threshold-selector').property('value')
        );
    });

    d3.select('#threshold-selector').on('change', function() {
        drawChordDiagram(
            data,
            d3.select('#genre-selector').property('value'),
            this.value
        );
    });

    // Initial visualization
    drawChordDiagram(data, 'all', '0.25');
});