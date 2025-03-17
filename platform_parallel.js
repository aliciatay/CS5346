// Platform metrics to compare - Updated version with brushing and improved interactivity
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

// Function to create the parallel coordinates plot
function createParallelPlot(data) {
    // Clear previous plot
    d3.select('#parallel-plot').html('');

    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    const width = 1100 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select('#parallel-plot')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create a single scale for all platforms
    const allValues = [];
    platforms.forEach(platform => {
        const values = data.map(d => d[platform.id]).filter(v => v > 0);
        allValues.push(...values);
    });

    const y = d3.scaleLog()
        .domain([d3.min(allValues), d3.max(allValues)])
        .range([height, 0])
        .clamp(true);

    // Create x scale for platforms
    const x = d3.scalePoint()
        .range([0, width])
        .domain(platforms.map(d => d.id));

    // Function to draw the lines
    function path(d) {
        return d3.line()(platforms.map(p => [x(p.id), y(Math.max(1, d[p.id]))]));
    }

    // Add grey background lines
    svg.append('g')
        .attr('class', 'background-lines')
        .selectAll('path')
        .data(data)
        .enter()
        .append('path')
        .attr('class', 'background-line')
        .attr('d', path);

    // Add colored foreground lines with interactivity
    const foreground = svg.append('g')
        .attr('class', 'foreground-lines')
        .selectAll('path')
        .data(data)
        .enter()
        .append('path')
        .attr('class', 'foreground-line')
        .attr('d', path)
        .style('stroke', '#4682b4')
        .style('stroke-width', '1.5px')
        .style('opacity', 0.5)
        .on('mouseover', function(event, d) {
            // Highlight the hovered line
            d3.select(this)
                .style('stroke', '#ff4444')
                .style('stroke-width', '3px')
                .style('opacity', 1)
                .raise();

            // Show tooltip with song details
            const tooltip = d3.select('#tooltip');
            let text = `${d.track_name} by ${d.artist_name}\n\n`;
            platforms.forEach(p => {
                text += `${p.label}: ${formatNumber(d[p.id])}\n`;
            });
            tooltip.style('display', 'block')
                .html(text.replace(/\n/g, '<br>'))
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            // Reset line style
            d3.select(this)
                .style('stroke', '#4682b4')
                .style('stroke-width', '1.5px')
                .style('opacity', 0.5);

            // Hide tooltip
            d3.select('#tooltip').style('display', 'none');
        });

    // Add axes
    const axes = svg.selectAll('.dimension')
        .data(platforms)
        .enter()
        .append('g')
        .attr('class', 'dimension')
        .attr('transform', d => `translate(${x(d.id)},0)`);

    axes.append('g')
        .attr('class', 'axis')
        .each(function() {
            d3.select(this).call(d3.axisLeft(y)
                .ticks(5)
                .tickFormat(formatNumber));
        });

    // Add platform labels
    axes.append('text')
        .attr('class', 'axis-label')
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .text(d => d.label)
        .style('fill', '#2c3e50');

    // Add grid lines
    axes.append('g')
        .attr('class', 'grid-lines')
        .selectAll('line')
        .data(y.ticks(5))
        .enter()
        .append('line')
        .attr('x1', -5)
        .attr('x2', 5)
        .attr('y1', d => y(d))
        .attr('y2', d => y(d))
        .attr('stroke', '#ddd')
        .attr('stroke-width', 1);

    // Add brushes for each axis
    axes.append('g')
        .attr('class', 'brush')
        .each(function(d) {
            d3.select(this).call(d3.brushY()
                .extent([[-8, 0], [8, height]])
                .on('brush', brushed));
        });

    // Brush event handler
    function brushed(event) {
        const selection = event.selection;
        if (!selection) return;

        const dimension = this.parentNode.__data__.id;
        const [min, max] = selection.map(y.invert);

        // Update line visibility based on brush
        svg.selectAll('.foreground-line')
            .style('display', d => {
                return (d[dimension] >= min && d[dimension] <= max) ? null : 'none';
            });
    }
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
    const genres = ['all', ...new Set(data.map(d => 
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
        .text(d => d === 'all' ? 'All' : d)
        .attr('value', d => d.toLowerCase());

    // Set default value to 'all'
    genreSelector.property('value', 'all');

    // Function to update visualization
    function updateVisualization() {
        const selectedGenre = genreSelector.property('value');
        let filteredData = selectedGenre === 'all' 
            ? data 
            : data.filter(d => d.genre.toLowerCase().includes(selectedGenre));

        createParallelPlot(filteredData);
    }

    // Add event listeners
    genreSelector.on('change', updateVisualization);

    // Initial visualization
    updateVisualization();
}); 