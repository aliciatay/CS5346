// Load the data files
Promise.all([
    d3.json('data/filters.json'),
    d3.json('data/factors.json'),
    d3.csv('data/happiness_correlations.csv')
]).then(function(data) {
    const filters = data[0];
    const factorNames = data[1];
    const rawData = data[2];
    
    // Log the raw data to see what we're working with
    console.log("RAW DATA SAMPLE:", rawData.slice(0, 10));
    console.log("Total records:", rawData.length);
    console.log("Years available:", [...new Set(rawData.map(d => d.year))].sort());
    
    // Initialize the visualization
    initFilters(filters);
    updateChart();
    
    // Event listeners for filter changes
    d3.select('#level-select').on('change', function() {
        updateFilterVisibility();
        updateChart();
    });
    d3.select('#region-select').on('change', updateChart);
    d3.select('#country-select').on('change', updateChart);
    d3.select('#year-select').on('change', function() {
        console.log("Year changed to:", this.value);
        updateChart();
    });
    
    // Initialize filters with available options
    function initFilters(filters) {
        // Populate region dropdown
        d3.select('#region-select')
            .selectAll('option')
            .data(filters.regions)
            .enter()
            .append('option')
            .attr('value', d => d)
            .text(d => d);
            
        // Populate country dropdown
        d3.select('#country-select')
            .selectAll('option')
            .data(filters.countries)
            .enter()
            .append('option')
            .attr('value', d => d)
            .text(d => d);
            
        // Populate year dropdown
        d3.select('#year-select')
            .selectAll('option')
            .data(filters.years)
            .enter()
            .append('option')
            .attr('value', d => d)
            .text(d => d);
            
        // Set initial visible state for filter dropdowns
        updateFilterVisibility();
    }
    
    // Show/hide dropdowns based on level selection
    function updateFilterVisibility() {
        const level = d3.select('#level-select').property('value');
        
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
    
    // Create or update the spider chart
    function updateChart() {
        console.log("UPDATING CHART");
        
        // Get current filter values
        const level = d3.select('#level-select').property('value');
        const selectedRegion = d3.select('#region-select').property('value');
        const selectedCountry = d3.select('#country-select').property('value');
        const selectedYear = d3.select('#year-select').property('value');
        
        console.log("Filters:", { level, region: selectedRegion, country: selectedCountry, year: selectedYear });
        
        // Filter the data based on current selections
        let filteredData = rawData.filter(d => d.level === level);
        
        // Apply location filter
        if (level === 'By Region') {
            if (selectedRegion !== 'All') {
                filteredData = filteredData.filter(d => d.region === selectedRegion);
            }
        } else { // By Country
            if (selectedCountry !== 'All') {
                filteredData = filteredData.filter(d => d.country === selectedCountry);
            }
        }
        
        // Apply year filter
        if (selectedYear !== 'All') {
            // First look for exact year matches
            const exactYearMatches = filteredData.filter(d => d.year === selectedYear);
            
            if (exactYearMatches.length > 0) {
                console.log(`Found ${exactYearMatches.length} exact matches for year ${selectedYear}`);
                filteredData = exactYearMatches;
            } else {
                // As a fallback, use data marked as 'All' years
                console.log(`No exact matches for year ${selectedYear}, falling back to 'All' years data`);
                filteredData = filteredData.filter(d => d.year === 'All');
            }
        }
        
        console.log("Filtered data count:", filteredData.length);
        
        // Check if we have any data after filtering
        if (filteredData.length === 0) {
            console.log("No data to display");
            showNoDataMessage();
            return;
        }
        
        // Group the data for display
        const groupedData = {};
        
        if (level === 'By Region') {
            // Group by region
            filteredData.forEach(d => {
                const region = d.region;
                if (!groupedData[region]) {
                    groupedData[region] = {};
                }
                // Store the correlation value for this factor
                groupedData[region][d.factor] = +d.correlation;
            });
        } else {
            // Group by country
            filteredData.forEach(d => {
                const country = d.country;
                if (!groupedData[country]) {
                    groupedData[country] = {};
                }
                // Store the correlation value for this factor
                groupedData[country][d.factor] = +d.correlation;
            });
        }
        
        console.log("Grouped data:", groupedData);
        
        // Format the data for the chart
        const chartData = [];
        for (const entityName in groupedData) {
            const dataPoint = { name: entityName };
            // Add all factor values
            Object.keys(groupedData[entityName]).forEach(factor => {
                dataPoint[factor] = groupedData[entityName][factor];
            });
            chartData.push(dataPoint);
        }
        
        console.log("Chart data:", chartData);
        
        // Get the factors to display
        const factors = Object.keys(factorNames);
        
        // Create the chart
        drawRadarChart(chartData, factors);
    }
    
    // Show a message when no data is available
    function showNoDataMessage() {
        // Clear previous chart
        const container = d3.select('#spider-chart').html('');
        
        // Add a message
        container.append('div')
            .attr('class', 'no-data-message')
            .style('text-align', 'center')
            .style('padding', '100px 20px')
            .style('color', '#666')
            .style('font-size', '16px')
            .text('No data available for the selected filters. Please try different filter options.');
            
        // Clear the legend as well
        d3.select('#chart-legend').html('');
    }
    
    // Draw the radar/spider chart
    function drawRadarChart(data, factors) {
        console.log("Drawing radar chart with", data.length, "items and", factors.length, "factors");
        
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
            .text(d => factorNames[d])
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
            console.log(`Drawing ${d.name}`);
            
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
        
        // Improved helper function to wrap text
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
});
