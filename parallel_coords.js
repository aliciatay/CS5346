// Group features into categories
const featureGroups = {
    musical: ['danceability', 'energy', 'valence', 'acousticness', 'loudness', 'speechiness', 'instrumentalness', 'liveness'],
    technical: ['duration_ms', 'key', 'mode', 'time_signature', 'tempo', 'chorus_hit', 'sections', 'segments']
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
    'duration_ms': 'Duration (ms)',
    'key': 'Key',
    'mode': 'Mode',
    'time_signature': 'Time Signature',
    'tempo': 'Tempo',
    'chorus_hit': 'Chorus Hit',
    'sections': 'Sections',
    'segments': 'Segments'
};

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
            streams: +d['Spotify Streams'],
            playlists: +d['Spotify Playlist Count'],
            features: [...featureGroups.musical, ...featureGroups.technical].reduce((obj, feature) => {
                obj[feature] = +d[feature];
                // Normalize values to 0-1 range
                if (feature === 'loudness') {
                    obj[feature] = (+d[feature] + 60) / 60;
                } else if (feature === 'duration_ms') {
                    // Normalize duration to 0-1 range (assuming max duration of 10 minutes)
                    obj[feature] = Math.min(+d[feature] / (10 * 60 * 1000), 1);
                } else if (feature === 'key') {
                    // Normalize key (0-11) to 0-1 range
                    obj[feature] = +d[feature] / 11;
                } else if (feature === 'mode') {
                    // Mode is already 0 or 1
                    obj[feature] = +d[feature];
                } else if (feature === 'time_signature') {
                    // Normalize time signature (typically 3-7) to 0-1 range
                    obj[feature] = (+d[feature] - 3) / 4;
                } else if (feature === 'tempo') {
                    // Normalize tempo (assuming max tempo of 200 BPM)
                    obj[feature] = Math.min(+d[feature] / 200, 1);
                } else if (feature === 'chorus_hit') {
                    // Normalize chorus hit timing relative to song duration
                    obj[feature] = +d[feature] / (+d['duration_ms']);
                } else if (feature === 'sections' || feature === 'segments') {
                    // Normalize section and segment counts (assuming max of 20 sections and 100 segments)
                    const maxCount = feature === 'sections' ? 20 : 100;
                    obj[feature] = Math.min(+d[feature] / maxCount, 1);
                }
                return obj;
            }, {})
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

// Update visualization based on filters
function updateVisualization(data, year, genre) {
    console.log('Updating visualization with:', {
        year: year,
        genre: genre,
        totalDataPoints: data.length
    });
    
    // Filter data based on year (if not All Time) and genre
    let filteredData;
    const isAllTime = d3.select('#all-time-checkbox').property('checked');
    
    if (isAllTime) {
        console.log('All Time selected - using complete dataset');
        filteredData = [...data];  // Use all data
    } else {
        console.log('Filtering data for year <=', year);
        filteredData = data.filter(d => d.year <= year);
    }
    
    if (genre !== 'all') {
        console.log('Filtering by genre:', genre);
        filteredData = filteredData.filter(d => d.genre.toLowerCase() === genre.toLowerCase());
    }

    console.log('Filtered data points:', filteredData.length);

    if (filteredData.length === 0) {
        console.log('No data available for current selection');
        d3.select('#no-data').style('display', 'block');
        d3.select('#parallel-coords').style('display', 'none');
        return;
    }

    d3.select('#no-data').style('display', 'none');
    d3.select('#parallel-coords').style('display', 'block');

    // Get current threshold value and calculate percentile
    const thresholdValue = d3.select('#threshold-selector').property('value');
    const thresholdPercentile = 1 - parseFloat(thresholdValue);
    console.log('Threshold settings:', {
        value: thresholdValue,
        percentile: thresholdPercentile
    });

    // Calculate thresholds using the selected percentile
    const streamsArray = filteredData.map(d => d.streams).sort(d3.ascending);
    const playlistArray = filteredData.map(d => d.playlists).sort(d3.ascending);
    
    const streamsThreshold = d3.quantile(streamsArray, thresholdPercentile);
    const playlistThreshold = d3.quantile(playlistArray, thresholdPercentile);
    
    console.log('Calculated thresholds:', {
        streams: streamsThreshold,
        playlists: playlistThreshold
    });

    // Split into hits and non-hits
    const hits = filteredData.filter(d => d.streams >= streamsThreshold && d.playlists >= playlistThreshold);
    const nonHits = filteredData.filter(d => d.streams < streamsThreshold || d.playlists < playlistThreshold);
    
    console.log('Data split:', {
        hits: hits.length,
        nonHits: nonHits.length,
        total: filteredData.length
    });

    // Draw the parallel coordinates visualization
    drawParallelCoordinates(data, filteredData, hits, nonHits);
}

function drawParallelCoordinates(data, filteredData, hits, nonHits) {
    const container = d3.select('#parallel-coords');
    container.html(''); // Clear previous content

    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    const width = 1000 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales for each feature
    const features = [...featureGroups.musical, ...featureGroups.technical];
    const xScale = d3.scalePoint()
        .domain(features)
        .range([0, width]);

    const yScales = {};
    features.forEach(feature => {
        yScales[feature] = d3.scaleLinear()
            .domain([0, 1])
            .range([height, 0]);
    });

    // Add group background rectangles
    const groupWidth = width / 2;
    svg.append('rect')
        .attr('x', 0)
        .attr('y', -30)
        .attr('width', groupWidth)
        .attr('height', height + 60)
        .attr('fill', '#f8f9fa')
        .attr('rx', 8);

    svg.append('rect')
        .attr('x', groupWidth)
        .attr('y', -30)
        .attr('width', groupWidth)
        .attr('height', height + 60)
        .attr('fill', '#f1f3f5')
        .attr('rx', 8);

    // Draw axes
    features.forEach(feature => {
        const axis = d3.axisLeft(yScales[feature]);
        const axisGroup = svg.append('g')
            .attr('transform', `translate(${xScale(feature)},0)`);
        
        // Draw axis
        axisGroup.call(axis);
        
        // Add label
        axisGroup.append('text')
            .attr('y', -10)
            .attr('x', 0)
            .attr('text-anchor', 'middle')
            .attr('fill', 'black')
            .style('font-size', '12px')
            .text(featureLabels[feature]);

        // Add group label (Musical/Technical)
        if (feature === featureGroups.musical[0] || feature === featureGroups.technical[0]) {
            const groupLabel = feature === featureGroups.musical[0] ? 'Musical Characteristics' : 'Technical Features';
            axisGroup.append('text')
                .attr('y', -30)
                .attr('x', feature === featureGroups.musical[0] ? width/4 : width*3/4)
                .attr('text-anchor', 'middle')
                .attr('fill', '#333')
                .style('font-size', '14px')
                .style('font-weight', 'bold')
                .text(groupLabel);
        }
    });

    // Draw connecting lines between axes
    const line = d3.line()
        .defined(d => !isNaN(d[1]))
        .x((d) => xScale(d[0]))
        .y((d) => d[1]);

    // Function to convert a data point to coordinates
    function getPathCoordinates(d) {
        return features.map(feature => {
            const value = d.features[feature];
            return [feature, yScales[feature](value)];
        });
    }

    // Draw lines for non-hits (blue)
    nonHits.forEach(d => {
        svg.append('path')
            .datum(getPathCoordinates(d))
            .attr('class', 'parallel-line non-hit')
            .attr('d', line)
            .style('fill', 'none')
            .style('stroke', 'rgba(54, 162, 235, 0.1)')
            .style('stroke-width', '1px');
    });

    // Draw lines for hits (red)
    hits.forEach(d => {
        svg.append('path')
            .datum(getPathCoordinates(d))
            .attr('class', 'parallel-line hit')
            .attr('d', line)
            .style('fill', 'none')
            .style('stroke', 'rgba(255, 99, 132, 0.1)')
            .style('stroke-width', '1px');
    });

    // Draw mean lines
    const hitMeans = features.map(feature => [
        feature,
        yScales[feature](d3.mean(hits, d => d.features[feature]))
    ]);

    const nonHitMeans = features.map(feature => [
        feature,
        yScales[feature](d3.mean(nonHits, d => d.features[feature]))
    ]);

    // Draw mean line for hits
    svg.append('path')
        .datum(hitMeans)
        .attr('class', 'parallel-line hit-mean')
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', 'rgb(255, 99, 132)')
        .style('stroke-width', '3px');

    // Draw mean line for non-hits
    svg.append('path')
        .datum(nonHitMeans)
        .attr('class', 'parallel-line non-hit-mean')
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', 'rgb(54, 162, 235)')
        .style('stroke-width', '3px');

    // Add legend
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 100}, -40)`);

    ['Hits', 'Non-Hits'].forEach((label, i) => {
        const color = label === 'Hits' ? 'rgb(255, 99, 132)' : 'rgb(54, 162, 235)';
        const group = legend.append('g')
            .attr('transform', `translate(0, ${i * 20})`);

        group.append('line')
            .attr('x1', 0)
            .attr('x2', 20)
            .attr('y1', 10)
            .attr('y2', 10)
            .style('stroke', color)
            .style('stroke-width', '3px');

        group.append('text')
            .attr('x', 30)
            .attr('y', 15)
            .text(label)
            .style('font-size', '12px')
            .style('font-weight', 'bold');
    });
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

    d3.select('#all-time-checkbox').on('change', function() {
        const yearSlider = d3.select('#year-slider');
        yearSlider.property('disabled', this.checked);
        updateVisualization(data, +yearSlider.property('value'), d3.select('#genre-selector').property('value'));
    });

    // Initial visualization
    updateVisualization(data, +d3.select('#year-slider').property('value'), 'all');
}); 