// Load the data files
Promise.all([
    d3.json('data/filters.json'),
    d3.json('data/factors.json'),
    d3.csv('data/happiness_correlations.csv')
]).then(function(data) {
    const filters = data[0];
    const factorNames = data[1];
    const rawData = data[2];
    
    // Convert all correlation values to numbers and separate data by year
    const dataByYear = {};
    rawData.forEach(d => {
        d.correlation = parseFloat(d.correlation); // Ensure correlation is a number
        
        // Organize data by year for quick access
        if (!dataByYear[d.year]) {
            dataByYear[d.year] = [];
        }
        dataByYear[d.year].push(d);
    });
    
    // Log data organization for debugging
    console.log("Years with data:", Object.keys(dataByYear).sort());
    Object.keys(dataByYear).forEach(year => {
        console.log(`Year ${year}: ${dataByYear[year].length} records`);
    });
    
    // Set up global variables
    let currentFilters = {
        level: 'By Region',
        region: 'All',
        country: 'All',
        year: 'All'
    };
    
    // Initialize the visualization
    initFilters(filters);
    updateFilterVisibility();
    drawChart();
    
    // Event listeners for filter changes
    d3.select('#level-select').on('change', function() {
        currentFilters.level = this.value;
        updateFilterVisibility();
        drawChart();
    });
    
    d3.select('#region-select').on('change', function() {
        currentFilters.region = this.value;
        drawChart();
    });
    
    d3.select('#country-select').on('change', function() {
        currentFilters.country = this.value;
        drawChart();
    });
    
    d3.select('#year-select').on('change', function() {
        const previousYear = currentFilters.year;
        currentFilters.year = this.value;
        console.log(`Year changed from ${previousYear} to ${currentFilters.year}`);
        drawChart();
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
    }
    
    // Show/hide dropdowns based on level selection
    function updateFilterVisibility() {
        const level = currentFilters.level;
        
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
    
    // Main function to filter data and update chart
    function drawChart() {
        console.log("REDRAWING CHART WITH FILTERS:", currentFilters);
        
        // Step 1: Determine which data set to use based on year
        let dataToUse = [];
        
        // First try exact year match
        if (currentFilters.year !== 'All' && dataByYear[currentFilters.year]) {
            dataToUse = dataByYear[currentFilters.year];
            console.log(`Using data for specific year: ${currentFilters.year}`);
        } else if (currentFilters.year !== 'All') {
            // If specific year selected but no data, try using 'All' years data as fallback
            dataToUse = dataByYear['All'] || [];
            console.log(`No data for year ${currentFilters.year}, falling back to 'All' years data`);
        } else {
            // Use all available data if 'All' years selected 
            dataToUse = rawData;
            console.log("Using all available data");
        }
        
        // Step 2: Filter by level (Region/Country)
        dataToUse = dataToUse.filter(d => d.level === currentFilters.level);
        console.log(`After level (${currentFilters.level}) filter: ${dataToUse.length} records`);
        
        // Step 3: Apply region/country filter if not 'All'
        if (currentFilters.level === 'By Region' && currentFilters.region !== 'All') {
            dataToUse = dataToUse.filter(d => d.region === currentFilters.region);
            console.log(`After region (${currentFilters.region}) filter: ${dataToUse.length} records`);
        } else if (currentFilters.level === 'By Country' && currentFilters.country !== 'All') {
            dataToUse = dataToUse.filter(d => d.country === currentFilters.country);
            console.log(`After country (${currentFilters.country}) filter: ${dataToUse.length} records`);
        }
        
        // Step 4: Check if we have any data
        if (dataToUse.length === 0) {
            showNoDataMessage();
            return;
        }
        
        // Step 5: Group and format data for visualization
        const groupedData = {};
        
        // Group by region or country
        dataToUse.forEach(d => {
            const key = currentFilters.level === 'By Region' ? d.region : d.country;
            
            if (!groupedData[key]) {
                groupedData[key] = {};
            }
            
            // Store correlation for this factor
            groupedData[key][d.factor] = d.correlation;
        });
        
        // Format for D3
        const chartData = Object.keys(groupedData).map(key => {
            const item = { name: key };
            Object.keys(groupedData[key]).forEach(factor => {
                item[factor] = groupedData[key][factor];
            });
            return item;
        });
        
        console.log("CHART DATA:", chartData);
        
        // Draw the radar chart
        const factors = Object.keys(factorNames);
        drawRadarChart(chartData, factors);
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
            .text('No data available for the selected filters. Please try different filter options.');
            
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
