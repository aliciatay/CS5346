
// Load the data files
Promise.all([
    d3.json('data/filters.json'),
    d3.json('data/factors.json'),
    d3.csv('data/happiness_correlations.csv')
]).then(function(data) {
    const filters = data[0];
    const factorNames = data[1];
    const correlationData = data[2];
    
    // Initialize the visualization
    initFilters(filters);
    updateChart();
    
    // Event listeners for filter changes
    d3.select('#level-select').on('change', updateChart);
    d3.select('#region-select').on('change', updateFiltersAndChart);
    d3.select('#country-select').on('change', updateChart);
    d3.select('#year-select').on('change', updateChart);
    
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
        updateCountryDropdown(filters.countries);
            
        // Populate year dropdown
        d3.select('#year-select')
            .selectAll('option')
            .data(filters.years)
            .enter()
            .append('option')
            .attr('value', d => d)
            .text(d => d);
            
        // Set initial visible state for country dropdown
        updateFilterVisibility();
    }
    
    // Update filters based on selections
    function updateFiltersAndChart() {
        updateFilterVisibility();
        updateCountryDropdown();
        updateChart();
    }
    
    // Show/hide country dropdown based on level selection
    function updateFilterVisibility() {
        const level = d3.select('#level-select').property('value');
        const regionValue = d3.select('#region-select').property('value');
        
        // Show country dropdown only when Country level is selected
        const countryDropdown = d3.select('#country-select').node().parentNode;
        if (level === 'By Region') {
            countryDropdown.style.display = 'none';
        } else {
            countryDropdown.style.display = 'flex';
        }
    }
    
    // Update the country dropdown based on selected region
    function updateCountryDropdown() {
        const selectedRegion = d3.select('#region-select').property('value');
        let availableCountries;
        
        if (selectedRegion === 'All') {
            availableCountries = filters.countries;
        } else {
            availableCountries = ['All'].concat(
                correlationData
                    .filter(d => d.region === selectedRegion)
                    .map(d => d.country)
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .sort()
            );
        }
        
        // Update country dropdown
        const countrySelect = d3.select('#country-select');
        
        // Save current selection if possible
        const currentCountry = countrySelect.property('value');
        
        // Update options
        const options = countrySelect
            .selectAll('option')
            .data(availableCountries);
            
        options.exit().remove();
        
        options.enter()
            .append('option')
            .merge(options)
            .attr('value', d => d)
            .text(d => d);
            
        // Restore selection if it exists in new options, otherwise select 'All'
        if (availableCountries.includes(currentCountry)) {
            countrySelect.property('value', currentCountry);
        } else {
            countrySelect.property('value', 'All');
        }
    }
    
    // Get filtered data based on current selections
    function getFilteredData() {
        const level = d3.select('#level-select').property('value');
        const selectedRegion = d3.select('#region-select').property('value');
        const selectedCountry = d3.select('#country-select').property('value');
        const selectedYear = d3.select('#year-select').property('value');
        
        let filtered = correlationData.filter(d => d.level === level);
        
        // Apply region filter if not 'All'
        if (selectedRegion !== 'All') {
            filtered = filtered.filter(d => d.region === selectedRegion);
        }
        
        // Apply country filter if not 'All' and level is By Country
        if (level === 'By Country' && selectedCountry !== 'All') {
            filtered = filtered.filter(d => d.country === selectedCountry);
        }
        
        // Apply year filter if not 'All'
        if (selectedYear !== 'All') {
            filtered = filtered.filter(d => d.year === selectedYear);
        }
        
        return filtered;
    }
    
    // Create or update the spider chart
    function updateChart() {
        const filteredData = getFilteredData();
        const level = d3.select('#level-select').property('value');
        
        // Group data appropriately based on level
        let groupedData;
        if (level === 'By Region') {
            groupedData = d3.group(filteredData, d => d.region);
        } else { // By Country
            groupedData = d3.group(filteredData, d => d.country);
        }
        
        // Format data for radar chart
        const chartData = [];
        groupedData.forEach((values, key) => {
            const item = { name: key };
            values.forEach(d => {
                item[d.factor] = +d.correlation;
            });
            chartData.push(item);
        });
        
        // Get the unique factors from the data
        const factors = Object.keys(factorNames);
        
        // Draw or update the radar chart
        drawRadarChart(chartData, factors);
    }
    
    // Draw the radar/spider chart
    function drawRadarChart(data, factors) {
        // Clear previous chart
        d3.select('#spider-chart').html('');
        
        // Set up dimensions and layout
        const margin = { top: 50, right: 50, bottom: 50, left: 50 };
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
        
        // Create angles for each factor
        const angleSlice = Math.PI * 2 / factors.length;
        
        // Create the circular segments
        const levels = 5;
        svg.selectAll('.radar-chart-circle')
            .data(d3.range(-1, 1.1, 0.5))
            .enter()
            .append('circle')
            .attr('class', 'radar-chart-circle')
            .attr('r', d => radialScale(d))
            .style('fill', 'none')
            .style('stroke', '#CDCDCD')
            .style('stroke-width', '1px');
        
        // Add axis labels
        const axisLabels = svg.selectAll('.axis-label')
            .data(factors)
            .enter()
            .append('g')
            .attr('class', 'axis');
        
        axisLabels.append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', (d, i) => radialScale(1.1) * Math.cos(angleSlice * i - Math.PI / 2))
            .attr('y2', (d, i) => radialScale(1.1) * Math.sin(angleSlice * i - Math.PI / 2))
            .style('stroke', '#CDCDCD')
            .style('stroke-width', '1px');
        
        axisLabels.append('text')
            .attr('class', 'axis-label')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('x', (d, i) => radialScale(1.25) * Math.cos(angleSlice * i - Math.PI / 2))
            .attr('y', (d, i) => radialScale(1.25) * Math.sin(angleSlice * i - Math.PI / 2))
            .text(d => factorNames[d])
            .call(wrap, 60);
        
        // Create radar path function
        const radarLine = d3.lineRadial()
            .radius(d => radialScale(d.value))
            .angle((d, i) => i * angleSlice)
            .curve(d3.curveLinearClosed);
        
        // Generate a color scale
        const color = d3.scaleOrdinal(d3.schemeCategory10);
        
        // Draw the radar chart paths for each data point
        data.forEach((d, i) => {
            const dataValues = factors.map(factor => ({
                value: d[factor] || 0
            }));
            
            svg.append('path')
                .datum(dataValues)
                .attr('class', 'radar-chart-shape')
                .attr('d', radarLine)
                .style('fill', color(i))
                .style('fill-opacity', 0.3)
                .style('stroke', color(i))
                .style('stroke-width', '2px');
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
                .style('margin', '0 10px');
                
            legendItem.append('div')
                .style('width', '15px')
                .style('height', '15px')
                .style('background-color', color(i))
                .style('margin-right', '5px');
                
            legendItem.append('span')
                .text(d.name);
        });
        
        // Add annotations for value ranges
        svg.append('text')
            .attr('x', 0)
            .attr('y', -radius - 10)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('1.0 = Perfect Positive Correlation');
            
        svg.append('text')
            .attr('x', 0)
            .attr('y', radius + 20)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('-1.0 = Perfect Negative Correlation');
            
        // Helper function to wrap text
        function wrap(text, width) {
            text.each(function() {
                const text = d3.select(this);
                const words = text.text().split(/\s+/).reverse();
                let word;
                let line = [];
                let lineNumber = 0;
                const lineHeight = 1.1;
                const y = text.attr('y');
                const dy = parseFloat(text.attr('dy'));
                let tspan = text.text(null).append('tspan').attr('x', 0).attr('y', y).attr('dy', dy + 'em');
                
                while (word = words.pop()) {
                    line.push(word);
                    tspan.text(line.join(' '));
                    if (tspan.node().getComputedTextLength() > width) {
                        line.pop();
                        tspan.text(line.join(' '));
                        line = [word];
                        tspan = text.append('tspan').attr('x', 0).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').text(word);
                    }
                }
            });
        }
    }
});
