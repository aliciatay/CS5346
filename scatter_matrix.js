// Platform metrics to compare
const platforms = [
    { id: 'spotify_streams', label: 'Spotify', column: 'Spotify Streams' },
    { id: 'youtube_views', label: 'YouTube', column: 'YouTube Views' },
    { id: 'tiktok_views', label: 'TikTok', column: 'TikTok Views' },
    { id: 'deezer_reach', label: 'Deezer', column: 'Deezer Playlist Reach' },
    { id: 'apple_playlists', label: 'Apple Music', column: 'Apple Music Playlist Count' }
];

// Function to format numbers in a readable way
function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}

// Function to create the scatter plot matrix
function createScatterMatrix(data) {
    const margin = { top: 50, right: 50, bottom: 50, left: 70 };
    const size = 180;
    const padding = 20;
    const width = platforms.length * (size + padding);
    const height = width;

    // Create SVG
    const svg = d3.select('#scatter-matrix')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales for each platform
    const scales = {};
    platforms.forEach(platform => {
        const values = data.map(d => d[platform.id]).filter(v => v > 0);
        scales[platform.id] = d3.scaleLog()
            .domain([d3.min(values), d3.max(values)])
            .range([size, 0])
            .clamp(true);
    });

    // Create cells for each pair of platforms
    platforms.forEach((platform1, i) => {
        platforms.forEach((platform2, j) => {
            const cell = svg.append('g')
                .attr('transform', `translate(${j * (size + padding)},${i * (size + padding)})`);

            // Add cell background
            cell.append('rect')
                .attr('class', 'cell')
                .attr('width', size)
                .attr('height', size)
                .attr('fill', '#f8f9fa');

            // Add grid lines
            const gridLines = [0.25, 0.5, 0.75].map(d => d * size);
            
            // Vertical grid lines
            cell.selectAll('.vertical-grid')
                .data(gridLines)
                .enter()
                .append('line')
                .attr('class', 'grid-line')
                .attr('x1', d => d)
                .attr('x2', d => d)
                .attr('y1', 0)
                .attr('y2', size)
                .attr('stroke', '#e9ecef')
                .attr('stroke-dasharray', '2,2');

            // Horizontal grid lines
            cell.selectAll('.horizontal-grid')
                .data(gridLines)
                .enter()
                .append('line')
                .attr('class', 'grid-line')
                .attr('x1', 0)
                .attr('x2', size)
                .attr('y1', d => d)
                .attr('y2', d => d)
                .attr('stroke', '#e9ecef')
                .attr('stroke-dasharray', '2,2');

            if (i === j) {
                // Platform labels on diagonal
                cell.append('text')
                    .attr('class', 'axis-label')
                    .attr('x', size / 2)
                    .attr('y', size / 2)
                    .attr('text-anchor', 'middle')
                    .attr('alignment-baseline', 'middle')
                    .attr('font-weight', 'bold')
                    .text(platform1.label);
            } else {
                // Add diagonal reference line
                const lineScale = d3.scaleLinear().domain([0, size]).range([0, size]);
                cell.append('line')
                    .attr('x1', lineScale(0))
                    .attr('y1', lineScale(size))
                    .attr('x2', lineScale(size))
                    .attr('y2', lineScale(0))
                    .attr('stroke', '#dee2e6')
                    .attr('stroke-width', 1)
                    .attr('stroke-dasharray', '4,4');

                // Add scatter points
                cell.selectAll('circle')
                    .data(data)
                    .enter()
                    .append('circle')
                    .attr('class', 'point')
                    .attr('cx', d => {
                        const value = d[platform2.id];
                        return value > 0 ? scales[platform2.id](value) : 0;
                    })
                    .attr('cy', d => {
                        const value = d[platform1.id];
                        return value > 0 ? scales[platform1.id](value) : 0;
                    })
                    .attr('r', 3)
                    .attr('fill', '#4682b4')
                    .attr('fill-opacity', 0.6)
                    .on('mouseover', function() {
                        d3.select(this)
                            .attr('fill', '#ff4444')
                            .attr('r', 5)
                            .attr('fill-opacity', 1);
                    })
                    .on('mouseout', function() {
                        d3.select(this)
                            .attr('fill', '#4682b4')
                            .attr('r', 3)
                            .attr('fill-opacity', 0.6);
                    })
                    .append('title')
                    .text(d => `${d.track_name} by ${d.artist_name}\n${platform1.label}: ${formatNumber(d[platform1.id])}\n${platform2.label}: ${formatNumber(d[platform2.id])}`);
            }

            // Add axes with formatted ticks
            if (i === platforms.length - 1) { // Bottom edge
                const xAxis = d3.axisBottom(scales[platform2.id])
                    .ticks(3)
                    .tickFormat(formatNumber);
                
                cell.append('g')
                    .attr('transform', `translate(0,${size})`)
                    .call(xAxis)
                    .selectAll('text')
                    .attr('transform', 'rotate(-45)')
                    .style('text-anchor', 'end');
            }
            if (j === 0) { // Left edge
                const yAxis = d3.axisLeft(scales[platform1.id])
                    .ticks(3)
                    .tickFormat(formatNumber);
                
                cell.append('g')
                    .call(yAxis);
            }
        });
    });
}

// Load and process data
async function loadData() {
    try {
        const response = await fetch('final_df_cleaned.csv');
        const text = await response.text();
        const rows = d3.csvParse(text);

        // Process data
        const processedData = rows.map(d => ({
            track_name: d['Track Name'],
            artist_name: d['Artist Name'],
            genre: d.track_genre,
            spotify_streams: +d['Spotify Streams'] || 0,
            youtube_views: +d['YouTube Views'] || 0,
            tiktok_views: +d['TikTok Views'] || 0,
            deezer_reach: +d['Deezer Playlist Reach'] || 0,
            apple_playlists: +d['Apple Music Playlist Count'] || 0
        }));

        // Filter out entries with all zero values
        return processedData.filter(d => 
            d.spotify_streams > 0 || 
            d.youtube_views > 0 || 
            d.tiktok_views > 0 || 
            d.deezer_reach > 0 || 
            d.apple_playlists > 0
        );
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

// Initialize visualization
loadData().then(data => {
    // Get unique genres
    const genres = ['All', ...new Set(data.map(d => 
        d.genre.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
    ))].sort();

    // Populate genre selector
    const genreSelector = d3.select('#genre-selector');
    genreSelector.html(''); // Clear existing options
    genreSelector.selectAll('option')
        .data(genres)
        .enter()
        .append('option')
        .text(d => d)
        .attr('value', d => d.toLowerCase());

    // Add event listener for genre selection
    genreSelector.on('change', function() {
        const selectedGenre = this.value;
        const filteredData = selectedGenre === 'all' 
            ? data 
            : data.filter(d => d.genre.toLowerCase().includes(selectedGenre));
        
        d3.select('#scatter-matrix').html('');
        createScatterMatrix(filteredData);
    });

    // Initial visualization
    createScatterMatrix(data);
}); 