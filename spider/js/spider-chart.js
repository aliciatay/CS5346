// Main visualization code
document.addEventListener('DOMContentLoaded', function() {
    // Constants for factors
    const FACTORS = [
        'gdp_per_capita',
        'social_support',
        'healthy_life_expectancy',
        'freedom_to_make_life_choices',
        'generosity',
        'perceptions_of_corruption'
    ];
    
    const FACTOR_NAMES = {
        'gdp_per_capita': 'GDP per Capita',
        'social_support': 'Social Support',
        'healthy_life_expectancy': 'Healthy Life Expectancy',
        'freedom_to_make_life_choices': 'Freedom to Make Life Choices',
        'generosity': 'Generosity',
        'perceptions_of_corruption': 'Perceptions of Corruption'
    };
    
    // Load data
    d3.csv('../complete_world_happiness.csv').then(function(data) {
        console.log("Loaded data:", data.slice(0, 5)); // Debug first 5 rows
        
        // Format data - convert strings to numbers
        data.forEach(d => {
            d.happiness_score = +d.happiness_score;
            FACTORS.forEach(factor => {
                d[factor] = +d[factor];
            });
            // Ensure year is a string for consistency
            d.year = String(d.year).trim();
        });
        
        // Extract unique regions, countries, and years
        const regions = ['All'].concat([...new Set(data.map(d => d.region))].sort());
        const countries = ['All'].concat([...new Set(data.map(d => d.country))].sort());
        const years = ['All'].concat([...new Set(data.map(d => d.year))].sort());
        
        console.log("Available years:", years);
        console.log("Available regions:", regions);
        
        // Set up initial filters
        let filters = {
            level: 'By Region',
            region: 'All',
            country: 'All',
            year: 'All'
        };
        
        // Initialize the visualization
        initFilters(regions, countries, years);
        updateFilterVisibility();
        updateChart();
        
        // Event listeners for filter changes
        d3.select('#level-select').on('change', function() {
            filters.level = this.value;
            updateFilterVisibility();
            updateChart();
        });
        
        d3.select('#region-select').on('change', function() {
            filters.region = this.value;
            updateChart();
        });
        
        d3.select('#country-select').on('change', function() {
            filters.country = this.value;
            updateChart();
        });
        
        d3.select('#year-select').on('change', function() {
            filters.year = this.value;
            console.log(`Year changed to: ${filters.year}`);
            updateChart();
        });
        
        // Initialize filters with available options
        function initFilters(regions, countries, years) {
            // Populate region dropdown
            d3.select('#region-select')
                .selectAll('option')
                .data(regions)
                .enter()
                .append('option')
                .attr('value', d => d)
                .text(d => d);
                
            // Populate country dropdown
            d3.select('#country-select')
                .selectAll('option')
                .data(countries)
                .enter()
                .append('option')
                .attr('value', d => d)
                .text(d => d);
                
            // Populate year dropdown
            d3.select('#year-select')
                .selectAll('option')
                .data(years)
                .enter()
                .append('option')
                .attr('value', d => d)
                .text(d => d);
        }
        
        // Show/hide dropdowns based on level selection
        function updateFilterVisibility() {
            const level = filters.level;
            
            // Show relevant dropdowns based on level
            const regionDropdown = d3.select('#region-select').node().parentNode;
            const countryDropdown = d3.select('#country-select').node().parentNode;
            
            if (level === 'By Region') {
                regionDropdown.style.display = 'flex';
                countryDropdown.style.display = 'none';
            } else { // By Country
                regionDropdown.style.display = 'none';
                countryDropdown.style.display = 'flex';
            }
        }
        
        // Update the chart based on current filters
        function updateChart() {
            console.log("Updating chart with filters:", filters);
            
            // Filter data based on selections
            let filteredData = data;
            
            // Filter by year if not 'All'
            if (filters.year !== 'All') {
                filteredData = filteredData.filter(d => d.year === filters.year);
                console.log(`After year filter (${filters.year}): ${filteredData.length} records`);
            }
            
            // Filter by region or country depending on level
            if (filters.level === 'By Region') {
                if (filters.region !== 'All') {
                    filteredData = filteredData.filter(d => d.region === filters.region);
                    console.log(`After region filter (${filters.region}): ${filteredData.length} records`);
                }
            } else { // By Country
                if (filters.country !== 'All') {
                    filteredData = filteredData.filter(d => d.country === filters.country);
                    console.log(`After country filter (${filters.country}): ${filteredData.length} records`);
                }
            }
            
            // Check if we have enough data
            if (filteredData.length < 2) {
                showNoDataMessage();
                return;
            }
            
            // Calculate correlations for each factor with happiness score
            const correlations = calculateCorrelations(filteredData);
            console.log("Calculated correlations:", correlations);
            
            // Prepare data for radar chart
            const chartData = [{
                name: filters.level === 'By Region' ? 
                    (filters.region !== 'All' ? filters.region : 'All Regions') : 
                    (filters.country !== 'All' ? filters.country : 'All Countries'),
                ...correlations
            }];
            
            // Draw the radar chart
            drawRadarChart(chartData, FACTORS);
        }
        
        // Calculate Pearson correlation coefficient for each factor with happiness score
        function calculateCorrelations(data) {
            const correlations = {};
            
            FACTORS.forEach(factor => {
                // Extract pairs of factor value and happiness score
                const pairs = data.map(d => ({
                    factor: d[factor],
                    happiness: d.happiness_score
                }));
                
                correlations[factor] = pearsonCorrelation(
                    pairs.map(p => p.factor),
                    pairs.map(p => p.happiness)
                );
            });
            
            return correlations;
        }
        
        // Calculate Pearson correlation coefficient between two arrays
        function pearsonCorrelation(x, y) {
            // Check if arrays have sufficient length
            if (x.length < 2 || y.length < 2 || x.length !== y.length) {
                return 0;
            }
            
            // Calculate means
            const n = x.length;
            const xMean = x.reduce((sum, val) => sum + val, 0) / n;
            const yMean = y.reduce((sum, val) => sum + val, 0) / n;
            
            // Calculate numerator and denominators
            let numerator = 0;
            let xDenominator = 0;
            let yDenominator = 0;
            
            for (let i = 0; i < n; i++) {
                const xDiff = x[i] - xMean;
                const yDiff = y[i] - yMean;
                
                numerator += xDiff * yDiff;
                xDenominator += xDiff * xDiff;
                yDenominator += yDiff * yDiff;
            }
            
            // Handle edge cases to avoid division by zero
            if (xDenominator === 0 || yDenominator === 0) {
                return 0;
            }
            
            // Calculate correlation
            return numerator / Math.sqrt(xDenominator * yDenominator);
        }
        
        // Show a message when no data is available
        function showNoDataMessage() {
            console.log("NO DATA AVAILABLE FOR SELECTED FILTERS");
            
            // Clear previous chart
            const container = d3.select('#spider-chart').html('');
            
            // Add a message
            container.append('div')
                .attr('class', 'no-data-message')
                .style('text-align', 'center')
                .style('padding', '100px 20px')
                .style('color', '#666')
                .style('font-size', '16px')
                .text('Insufficient data for the selected filters. Please try different filter options.');
                
            // Clear the legend as well
            d3.select('#chart-legend').html('');
        }
        
        // Draw the radar/spider chart
        function drawRadarChart(data, factors) {
            console.log(`Drawing chart with ${data.length} items and ${factors.length} factors`);
            
            // Clear previous chart
            d3.select('#spider-chart').html('');
            
            // Set up dimensions and layout
            const margin = { top: 80, right: 80, bottom: 80, left: 80 };
            const width = Math.min(700, window.innerWidth - 10) - margin.left - margin.right;
            const height = Math.min(width, window.innerHeight - margin.top - margin.bottom - 200);
            const radius = Math.min(width, height) / 2;
            
            // Create SVG container
            const svg = d3.select('#spider-chart')
                .append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', `translate(${margin.left + width/2}, ${margin.top + height/2})`);
            
            // Create a scale for each axis
            const radialScale = d3.scaleLinear()
                .domain([-1, 1])
                .range([0, radius]);
            
            // Create angles for each factor - explicitly set them to be evenly distributed
            const angleSlice = Math.PI * 2 / factors.length;
            
            // Create the circular segments
            svg.selectAll('.radar-chart-circle')
                .data(d3.range(-1, 1.1, 0.5))
                .enter()
                .append('circle')
                .attr('class', 'radar-chart-circle')
                .attr('r', d => radialScale(d))
                .style('fill', 'none')
                .style('stroke', '#e2e2e2')
                .style('stroke-width', '1px');
            
            // Add labels for the circular segments
            svg.selectAll('.circle-label')
                .data([-1, -0.5, 0, 0.5, 1])
                .enter()
                .append('text')
                .attr('class', 'circle-label')
                .attr('x', 5)
                .attr('y', d => -radialScale(d))
                .text(d => d.toFixed(1))
                .style('font-size', '10px')
                .style('fill', '#666');
            
            // Add axis lines
            const axes = svg.selectAll('.axis')
                .data(factors)
                .enter()
                .append('g')
                .attr('class', 'axis');
            
            axes.append('line')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('x2', (d, i) => radialScale(1.1) * Math.cos(angleSlice * i - Math.PI / 2))
                .attr('y2', (d, i) => radialScale(1.1) * Math.sin(angleSlice * i - Math.PI / 2))
                .style('stroke', '#e2e2e2')
                .style('stroke-width', '1px');
            
            // Add axis labels with better positioning
            axes.append('text')
                .attr('class', 'axis-label')
                .attr('text-anchor', (d, i) => {
                    const angle = angleSlice * i - Math.PI / 2;
                    // Adjust text-anchor based on position around the circle
                    if (angle < -Math.PI * 0.75 || angle > Math.PI * 0.75) return 'end';
                    else if (angle > -Math.PI * 0.25 && angle < Math.PI * 0.25) return 'start';
                    else return 'middle';
                })
                .attr('dominant-baseline', (d, i) => {
                    const angle = angleSlice * i - Math.PI / 2;
                    // Adjust vertical alignment based on position
                    if (angle > -Math.PI * 0.1 && angle < Math.PI * 0.1) return 'middle';
                    else if (angle < 0) return 'hanging';
                    else return 'auto';
                })
                .attr('dy', (d, i) => {
                    const angle = angleSlice * i - Math.PI / 2;
                    // Adjust vertical position
                    if (angle < -Math.PI * 0.25 || angle > Math.PI * 0.25) return '0.3em';
                    else return '0';
                })
                .attr('x', (d, i) => radialScale(1.3) * Math.cos(angleSlice * i - Math.PI / 2))
                .attr('y', (d, i) => radialScale(1.3) * Math.sin(angleSlice * i - Math.PI / 2))
                .text(d => FACTOR_NAMES[d])
                .call(wrap, 80);
            
            // Create radar path function
            const radarLine = d3.lineRadial()
                .radius(d => radialScale(d.value))
                .angle((d, i) => i * angleSlice)
                .curve(d3.curveLinearClosed);
            
            // Define Tableau-like color palette
            const tableauColors = [
                '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', 
                '#59a14f', '#edc949', '#af7aa1', '#ff9da7', 
                '#9c755f', '#bab0ab'
            ];
            
            // Generate a color scale using Tableau colors
            const color = d3.scaleOrdinal(tableauColors);
            
            // Draw the radar chart paths for each data point
            data.forEach((d, i) => {
                const dataValues = factors.map(factor => {
                    const value = d[factor] || 0;
                    return { factor, value };
                });
                
                svg.append('path')
                    .datum(dataValues)
                    .attr('class', 'radar-chart-shape')
                    .attr('d', radarLine)
                    .style('fill', color(i))
                    .style('fill-opacity', 0.6)
                    .style('stroke', color(i))
                    .style('stroke-width', '1.5px');
            });
            
            // Create legend
            const legend = d3.select('#chart-legend')
                .html('')
                .append('div')
                .style('display', 'flex')
                .style('flex-wrap', 'wrap')
                .style('justify-content', 'center')
                .style('margin-top', '20px');
            
            data.forEach((d, i) => {
                const legendItem = legend.append('div')
                    .style('display', 'flex')
                    .style('align-items', 'center')
                    .style('margin', '0 10px 10px 10px');
                    
                legendItem.append('div')
                    .style('width', '15px')
                    .style('height', '15px')
                    .style('background-color', color(i))
                    .style('margin-right', '5px');
                    
                legendItem.append('span')
                    .text(d.name);
            });
            
            // Helper function to wrap text
            function wrap(text, width) {
                text.each(function() {
                    const text = d3.select(this);
                    const words = text.text().split(/\s+/).reverse();
                    let word;
                    let line = [];
                    let lineNumber = 0;
                    const lineHeight = 1.1;
                    const x = text.attr('x');
                    const y = text.attr('y');
                    const dy = parseFloat(text.attr('dy') || 0);
                    const textAnchor = text.attr('text-anchor');
                    
                    let tspan = text.text(null)
                        .append('tspan')
                        .attr('x', x)
                        .attr('y', y)
                        .attr('text-anchor', textAnchor)
                        .attr('dy', dy + 'em');
                    
                    while (word = words.pop()) {
                        line.push(word);
                        tspan.text(line.join(' '));
                        
                        if (tspan.node().getComputedTextLength() > width) {
                            line.pop();
                            tspan.text(line.join(' '));
                            line = [word];
                            
                            tspan = text.append('tspan')
                                .attr('x', x)
                                .attr('y', y)
                                .attr('text-anchor', textAnchor)
                                .attr('dy', ++lineNumber * lineHeight + dy + 'em')
                                .text(word);
                        }
                    }
                });
            }
        }
    }).catch(error => {
        console.error("Error loading data:", error);
        document.getElementById('spider-chart').innerHTML = `
            <div class="error-message">
                Error loading data: ${error.message}
            </div>
        `;
    });
});
