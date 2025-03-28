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
            // Get all years available for this specific country
            const countryData = data.filter(d => d.country === filters.country);
            const availableYears = [...new Set(countryData.map(d => d.year))].sort();
            
            console.log(`Country: ${filters.country}`);
            console.log(`Available years for ${filters.country}:`, availableYears);
            
            if (filters.year !== 'All' && !availableYears.includes(filters.year)) {
                // If the selected year is not available for this country
                showNoDataMessage(`No data available for ${filters.country} in ${filters.year}.<br><br>
                    Available years for ${filters.country}: ${availableYears.join(', ')}<br><br>
                    Please select an available year or choose 'All' to see data across all available years.`);
                return;
            }
            
            filteredData = filteredData.filter(d => d.country === filters.country);
            console.log(`After country filter (${filters.country}): ${filteredData.length} records`);
            
            // If no data for this specific country, show message
            if (filteredData.length === 0) {
                showNoDataMessage(`No data available for ${filters.country}. Please select a different country.`);
                return;
            }
        }
    }
    
    // Check if we have enough data
    if (filteredData.length < 2) {
        showNoDataMessage('Insufficient data for correlation calculation (need at least 2 data points).');
        return;
    }
    
    // Calculate correlations for each factor with happiness score
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
        .html(message); // Use html() instead of text() to allow HTML formatting
        
    // Clear the legend as well
    d3.select('#chart-legend').html('');
} 