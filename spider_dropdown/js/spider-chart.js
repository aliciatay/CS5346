// Main visualization code
document.addEventListener('DOMContentLoaded', function() {
    // Constants for factors
    const FACTORS = {
        gdp_per_capita: "GDP per Capita",
        social_support: "Social Support",
        healthy_life_expectancy: "Health Life Expectancy",
        freedom_to_make_life_choices: "Freedom",
        generosity: "Generosity",
        perceptions_of_corruption: "Perceptions of Corruption"
    };
    
    console.log("Starting to load data...");
    
    // Load data - fix path to point to the correct location
    d3.csv('complete_world_happiness.csv').then(function(data) {
        console.log("Loaded data:", data.slice(0, 5)); // Debug first 5 rows
        
        // Format data - convert strings to numbers
        data.forEach(d => {
            d.year = String(d.year); // Ensure year is a string for consistent matching
            d.happiness_score = +d.happiness_score;
            d.gdp_per_capita = +d.gdp_per_capita;
            d.social_support = +d.social_support;
            d.healthy_life_expectancy = +d.healthy_life_expectancy;
            d.freedom_to_make_life_choices = +d.freedom_to_make_life_choices;
            d.generosity = +d.generosity;
            d.perceptions_of_corruption = +d.perceptions_of_corruption;
        });
        
        // Extract unique regions, countries, and years
        const regions = ['All'].concat([...new Set(data.map(d => d.region))].sort());
        const countries = ['All'].concat([...new Set(data.map(d => d.country))].sort());
        const years = ['All'].concat([...new Set(data.map(d => d.year))].sort((a, b) => b.localeCompare(a))); // Sort years in descending order
        
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
            console.log("Year changed to:", filters.year);
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
                
            console.log("Initialized filters with options");
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
            console.log("Starting with all data:", filteredData.length, "records");
            
            // Filter by year if not 'All'
            if (filters.year !== 'All') {
                filteredData = filteredData.filter(d => d.year === filters.year);
                console.log(`After year filter (${filters.year}): ${filteredData.length} records`);
                console.log("Sample after year filter:", filteredData.slice(0, 2));
                
                // If no data for this specific year, show message
                if (filteredData.length === 0) {
                    showNoDataMessage(`No data available for the year ${filters.year}. Please select a different year.`);
                    return;
                }
            }
            
            // Filter by region or country depending on level
            if (filters.level === 'By Region') {
                if (filters.region !== 'All') {
                    // Debug: Show all unique regions in the filtered data
                    console.log("All regions in current filtered data:", [...new Set(filteredData.map(d => d.region))]);
                    
                    filteredData = filteredData.filter(d => d.region === filters.region);
                    console.log(`After region filter (${filters.region}): ${filteredData.length} records`);
                    console.log("Sample after region filter:", filteredData.slice(0, 2));
                }
            } else { // By Country
                if (filters.country !== 'All') {
                    filteredData = filteredData.filter(d => d.country === filters.country);
                    console.log(`After country filter (${filters.country}): ${filteredData.length} records`);
                    
                    // If no data for this specific country in this year, show message
                    if (filteredData.length === 0) {
                        if (filters.year !== 'All') {
                            showNoDataMessage(`No data available for ${filters.country} in ${filters.year}. Try selecting 'All' for year or choose a different country.`);
                        } else {
                            showNoDataMessage(`No data available for ${filters.country}. Please select a different country.`);
                        }
                        return;
                    }
                }
            }
            
            // Check if we have enough data
            if (filteredData.length < 1) {
                showNoDataMessage('No data available for the selected filters. Please try different filter options.');
                return;
            }
            
            // If we have exactly one data point (country in specific year)
            if (filteredData.length === 1) {
                console.log("Single data point mode - showing raw values instead of correlations");
                // Display the actual factor values directly instead of correlations
                const singleDataPoint = filteredData[0];
                
                // Normalize the factor values to a -1 to 1 scale for display
                // We'll use min-max scaling based on the full dataset's range for each factor
                const factorRanges = {};
                
                Object.keys(FACTORS).forEach(factor => {
                    const allValues = data.map(d => d[factor]);
                    factorRanges[factor] = {
                        min: d3.min(allValues),
                        max: d3.max(allValues)
                    };
                });
                
                const normalizedValues = {};
                Object.keys(FACTORS).forEach(factor => {
                    const range = factorRanges[factor];
                    const value = singleDataPoint[factor];
                    // Normalize to -1 to 1 range
                    const normalized = ((value - range.min) / (range.max - range.min) * 2) - 1;
                    normalizedValues[factor] = normalized;
                });
                
                console.log("Normalized values for single point:", normalizedValues);
                
                // Prepare data for radar chart
                const chartData = [{
                    name: singleDataPoint.country,
                    ...normalizedValues
                }];
                
                console.log("Chart data prepared (single point mode):", chartData);
                
                // Draw the radar chart
                drawRadarChart(chartData, FACTORS);

                // Add a note explaining that we're showing actual values for a single year
                d3.select('#chart-legend')
                    .append('div')
                    .attr('class', 'info-message')
                    .style('text-align', 'center')
                    .style('padding', '10px')
                    .style('margin-top', '20px')
                    .style('color', '#4e79a7')
                    .style('font-size', '14px')
                    .style('font-family', "'Berton Sans Book', Arial, sans-serif")
                    .style('background-color', '#f0f7ff')
                    .style('border-radius', '4px')
                    .style('border', '1px solid #4e79a7')
                    .html(`Showing normalized happiness factor values for ${singleDataPoint.country} in ${singleDataPoint.year}.<br>
                            <span style="font-size: 12px">Note: Values are normalized to a -1 to 1 scale based on the range across all countries and years.</span>`);

                return;
            }
            
            // For multiple data points, calculate correlations as before
            const correlations = calculateCorrelations(filteredData);
            console.log("Calculated correlations:", correlations);
            
            // Debug: Check for missing values or NaN in correlations
            Object.keys(correlations).forEach(key => {
                if (isNaN(correlations[key]) || correlations[key] === null || correlations[key] === undefined) {
                    console.error(`Problem with correlation for ${key}: ${correlations[key]}`);
                }
            });
            
            // Prepare data for radar chart
            const chartData = [{
                name: filters.level === 'By Region' ? 
                    (filters.region !== 'All' ? filters.region : 'All Regions') : 
                    (filters.country !== 'All' ? filters.country : 'All Countries'),
                ...correlations
            }];
            
            console.log("Chart data prepared:", chartData);
            
            // Draw the radar chart
            drawRadarChart(chartData, FACTORS);

            // Add a note explaining that we're showing correlations
            d3.select('#chart-legend')
                .append('div')
                .attr('class', 'info-message')
                .style('text-align', 'center')
                .style('padding', '10px')
                .style('margin-top', '20px')
                .style('color', '#4e79a7')
                .style('font-size', '14px')
                .style('font-family', "'Berton Sans Book', Arial, sans-serif")
                .style('background-color', '#f0f7ff')
                .style('border-radius', '4px')
                .style('border', '1px solid #4e79a7')
                .html(`Showing correlations between happiness factors and overall happiness scores for the selected filters.<br>
                        <span style="font-size: 12px">Values range from -1.0 (strongest negative correlation) to 1.0 (strongest positive correlation).</span>`);
        }
        
        // Calculate Pearson correlation coefficient for each factor with happiness score
        function calculateCorrelations(data) {
            const correlations = {};
            
            Object.keys(FACTORS).forEach(factor => {
                const happinessValues = data.map(d => d.happiness_score);
                const factorValues = data.map(d => d[factor]);
                
                // Debug: Check for undefined or NaN values
                const hasInvalidValues = happinessValues.some(v => isNaN(v) || v === undefined) || 
                                        factorValues.some(v => isNaN(v) || v === undefined);
                                        
                if (hasInvalidValues) {
                    console.error(`Invalid values found for ${factor}:`, {
                        happiness: happinessValues.filter(v => isNaN(v) || v === undefined),
                        factor: factorValues.filter(v => isNaN(v) || v === undefined)
                    });
                }
                
                // Calculate means
                const happinessMean = d3.mean(happinessValues);
                const factorMean = d3.mean(factorValues);
                
                console.log(`${factor} means:`, { happiness: happinessMean, factor: factorMean });
                
                // Calculate correlation coefficient
                let numerator = 0;
                let denominatorHappiness = 0;
                let denominatorFactor = 0;
                
                for (let i = 0; i < data.length; i++) {
                    const happinessDiff = happinessValues[i] - happinessMean;
                    const factorDiff = factorValues[i] - factorMean;
                    
                    numerator += happinessDiff * factorDiff;
                    denominatorHappiness += happinessDiff * happinessDiff;
                    denominatorFactor += factorDiff * factorDiff;
                }
                
                // Avoid division by zero
                if (denominatorHappiness === 0 || denominatorFactor === 0) {
                    console.error(`Division by zero error for ${factor}`);
                    correlations[factor] = 0; // Default to zero correlation if there's a division by zero
                } else {
                    const correlation = numerator / Math.sqrt(denominatorHappiness * denominatorFactor);
                    correlations[factor] = correlation;
                }
            });
            
            return correlations;
        }
        
        // Show a message when no data is available
        function showNoDataMessage(message = 'Insufficient data for the selected filters. Please try different filter options.') {
            console.log("NO DATA AVAILABLE:", message);
            
            // Clear previous chart
            const container = d3.select('#spider-chart').html('');
            
            // Add a message
            container.append('div')
                .attr('class', 'no-data-message')
                .style('text-align', 'center')
                .style('padding', '100px 20px')
                .style('color', '#666')
                .style('font-size', '16px')
                .style('font-family', "'Berton Sans Book', Arial, sans-serif")
                .text(message);
                
            // Clear the legend as well
            d3.select('#chart-legend').html('');
        }
        
        // Draw the radar/spider chart
        function drawRadarChart(data, factors) {
            console.log(`Drawing chart with ${data.length} items and ${Object.keys(factors).length} factors`);
            
            // Clear previous chart
            d3.select('#spider-chart').html('');
            
            // Check if we have valid data
            if (data.length === 0 || Object.keys(factors).length === 0) {
                showNoDataMessage('Error: No data or factors to display in the chart.');
                return;
            }
            
            // Check that all factors have values
            const missingFactors = Object.keys(factors).filter(f => 
                data[0][f] === undefined || data[0][f] === null || isNaN(data[0][f])
            );
            
            if (missingFactors.length > 0) {
                showNoDataMessage(`Error: Missing correlation values for factors: ${missingFactors.join(', ')}`);
                console.error('Missing factors in data:', missingFactors);
                console.error('Current data item:', data[0]);
                return;
            }

            // Set up dimensions and layout
            const margin = { top: 100, right: 100, bottom: 100, left: 100 };
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
            const angleSlice = Math.PI * 2 / Object.keys(factors).length;
            
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
                .style('fill', '#666')
                .style('font-family', "'Berton Sans Book', Arial, sans-serif");
            
            // Add axis lines
            const axes = svg.selectAll('.axis')
                .data(Object.keys(factors))
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
                .attr('x', (d, i) => radialScale(1.4) * Math.cos(angleSlice * i - Math.PI / 2)) // Increased distance for labels
                .attr('y', (d, i) => radialScale(1.4) * Math.sin(angleSlice * i - Math.PI / 2)) // Increased distance for labels
                .style('font-family', "'Berton Sans Book', Arial, sans-serif")
                .style('font-size', '12px') // Increased font size
                .style('fill', '#333')
                .text(d => FACTORS[d])
                .call(wrap, 100); // Increased wrap width
            
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
                const dataValues = Object.keys(factors).map(factor => {
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
                .style('margin-top', '20px')
                .style('font-family', "'Berton Sans Book', Arial, sans-serif");
            
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
                    .text(d.name)
                    .style('font-family', "'Berton Sans Book', Arial, sans-serif");
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
                        .attr('dy', dy + 'em')
                        .style('font-family', "'Berton Sans Book', Arial, sans-serif");
                    
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
                                .style('font-family', "'Berton Sans Book', Arial, sans-serif")
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
