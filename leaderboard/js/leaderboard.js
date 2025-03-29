// Main visualization code
document.addEventListener('DOMContentLoaded', function() {
    // Define global variables
    let data = [];
    let years = [];
    let currentYearIndex = 0;
    let animationSpeed = 1000; // milliseconds between frames
    let isPlaying = false;
    let animationTimer;
    let allCountries = []; // Array to store all unique countries
    let selectedCountry = ""; // Currently selected country for highlighting

    // Define color scale by region (using a more coordinated color palette)
    const regionColors = {
        "Western Europe": "#4e79a7", // Blue
        "North America and ANZ": "#59a14f", // Green
        "Latin America and Caribbean": "#f28e2c", // Orange
        "Middle East and North Africa": "#edc949", // Yellow
        "East Asia": "#e15759", // Red
        "Southeast Asia": "#76b7b2", // Teal
        "Central and Eastern Europe": "#b07aa1", // Purple
        "Commonwealth of Independent States": "#9c755f", // Brown
        "South Asia": "#bab0ab", // Gray
        "Sub-Saharan Africa": "#d37295" // Pink
    };
    
    // Default color for regions not in the mapping
    const defaultColor = "#cccccc";

    // Set up chart dimensions
    const margin = { top: 40, right: 170, bottom: 30, left: 80 };
    const width = document.getElementById('leaderboard-chart').clientWidth - margin.left - margin.right;
    const height = document.getElementById('leaderboard-chart').clientHeight - margin.top - margin.bottom;

    // Create SVG container
    const svg = d3.select('#leaderboard-chart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create x and y scales
    const x = d3.scaleLinear()
        .range([0, width]);

    const y = d3.scaleBand()
        .range([0, height])
        .padding(0.2);

    // Add x-axis
    const xAxis = svg.append('g')
        .attr('class', 'axis x-axis')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickFormat(d => d.toFixed(1)));

    // Add y-axis
    const yAxis = svg.append('g')
        .attr('class', 'axis y-axis');

    // Add title
    svg.append('text')
        .attr('class', 'chart-title')
        .attr('x', width / 2)
        .attr('y', -15)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text('Top 20 Countries by Happiness Score');

    // Function to create the color legend
    function createLegend() {
        const legendContainer = d3.select('#region-legend');
        
        // Clear any existing legend items
        legendContainer.html('');
        
        // Add a legend item for each region
        Object.entries(regionColors).forEach(([region, color]) => {
            const legendItem = legendContainer.append('div')
                .attr('class', 'legend-item');
            
            legendItem.append('div')
                .attr('class', 'legend-color')
                .style('background-color', color);
            
            legendItem.append('span')
                .attr('class', 'legend-text')
                .text(region);
        });
    }

    // Load data
    d3.csv('./complete_world_happiness.csv').then(function(csvData) {
        // Format data
        csvData.forEach(d => {
            d.happiness_score = +d.happiness_score;
            d.year = String(d.year);
        });

        // Get unique years
        years = [...new Set(csvData.map(d => d.year))].sort();
        console.log("Available years:", years);

        // Get all unique countries for the filter dropdown
        allCountries = [...new Set(csvData.map(d => d.country))].sort();
        
        // Populate the country dropdown
        const countrySelect = document.getElementById('country-select');
        allCountries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countrySelect.appendChild(option);
        });

        // Add event listener for country selection
        countrySelect.addEventListener('change', function() {
            selectedCountry = this.value;
            updateChart(currentYearIndex);
        });

        // Prepare data
        data = years.map(year => {
            const yearData = csvData.filter(d => d.year === year);
            
            // Sort by happiness score (descending) and take top 20
            const top20 = yearData
                .sort((a, b) => b.happiness_score - a.happiness_score)
                .slice(0, 20);
                
            // Add rank property
            top20.forEach((d, i) => {
                d.rank = i + 1;
            });
            
            // If there's a selected country and it's not in the top 20,
            // find it in the full dataset and add it with its actual rank
            if (selectedCountry && !top20.find(d => d.country === selectedCountry)) {
                const selectedCountryData = yearData.find(d => d.country === selectedCountry);
                if (selectedCountryData) {
                    // Find its rank in the full dataset
                    const rank = yearData.findIndex(d => d.country === selectedCountry) + 1;
                    selectedCountryData.rank = rank;
                    top20.push(selectedCountryData);
                }
            }
            
            return {
                year: year,
                countries: top20
            };
        });

        console.log("Prepared data:", data);

        // Set the domain for scales based on all data
        const maxScore = d3.max(data, d => d3.max(d.countries, c => c.happiness_score));
        x.domain([0, maxScore * 1.1]); // Add 10% padding

        // Create the color legend
        createLegend();

        // Initialize the visualization
        updateChart(0);

        // Set up event listeners
        document.getElementById('play-button').addEventListener('click', startAnimation);
        document.getElementById('pause-button').addEventListener('click', pauseAnimation);
        document.getElementById('speed-input').addEventListener('input', function() {
            animationSpeed = parseInt(this.value);
            if (isPlaying) {
                pauseAnimation();
                startAnimation();
            }
        });

        // Start the animation automatically
        startAnimation();
    }).catch(function(error) {
        console.error("Error loading data:", error);
        document.getElementById('leaderboard-chart').innerHTML = 
            `<div style="text-align: center; color: red; padding: 50px;">
                Error loading data: ${error.message}
            </div>`;
    });

    // Function to update the chart for a given year index
    function updateChart(yearIndex) {
        // Update current year index
        currentYearIndex = yearIndex;
        
        // Get data for current year
        let yearData = data[yearIndex];
        document.getElementById('current-year').textContent = `Year: ${yearData.year}`;
        
        // If there's a selected country and it's not in the top 20,
        // we need to modify the data to include it
        if (selectedCountry) {
            // Check if we need to update the data with the selected country
            const yearFullData = data.map(d => d).find(d => d.year === yearData.year);
            
            // If selected country is not in the current display data
            if (!yearData.countries.find(d => d.country === selectedCountry)) {
                // Find the country in the full dataset for this year
                // This would be added in the data preparation phase
                const allCountriesData = d3.csv('./complete_world_happiness.csv')
                    .then(csvData => {
                        csvData = csvData.filter(d => d.year === yearData.year);
                        const selectedCountryData = csvData.find(d => d.country === selectedCountry);
                        
                        if (selectedCountryData) {
                            // Find the rank by sorting all countries by happiness score
                            const sortedCountries = [...csvData].sort((a, b) => 
                                +b.happiness_score - +a.happiness_score);
                            const rank = sortedCountries.findIndex(d => d.country === selectedCountry) + 1;
                            
                            selectedCountryData.happiness_score = +selectedCountryData.happiness_score;
                            selectedCountryData.rank = rank;
                            
                            // Add to the display data if not already there
                            if (!yearData.countries.find(d => d.country === selectedCountry)) {
                                yearData = {
                                    year: yearData.year,
                                    countries: [...yearData.countries, selectedCountryData]
                                };
                            }
                            
                            // Update the display with the new data
                            updateDisplay(yearData);
                        }
                    });
            } else {
                updateDisplay(yearData);
            }
        } else {
            updateDisplay(yearData);
        }
    }
    
    function updateDisplay(yearData) {
        // Update y-scale domain
        y.domain(yearData.countries.map(d => d.country));
        
        // Update y-axis with animation
        yAxis.transition()
            .duration(animationSpeed * 0.9)
            .call(d3.axisLeft(y).tickSize(0).tickPadding(5));
        
        // Remove axis line
        yAxis.select('.domain').remove();
        
        // Remove country labels from y-axis (as we'll use rank + score only)
        yAxis.selectAll('.tick text').remove();
        
        // Bind data to bars
        const bars = svg.selectAll('.country-bar')
            .data(yearData.countries, d => d.country);
        
        // Exit old bars
        bars.exit().remove();
        
        // Enter new bars
        const barsEnter = bars.enter()
            .append('rect')
            .attr('class', 'country-bar')
            .attr('y', d => y(d.country))
            .attr('height', y.bandwidth())
            .attr('x', 0)
            .attr('width', 0)
            .attr('fill', d => regionColors[d.region] || defaultColor);
        
        // Update all bars
        barsEnter.merge(bars)
            .transition()
            .duration(animationSpeed * 0.9)
            .attr('y', d => y(d.country))
            .attr('width', d => x(d.happiness_score))
            .attr('fill', d => regionColors[d.region] || defaultColor)
            .attr('class', d => `country-bar ${d.country === selectedCountry ? 'highlighted' : ''}`);
        
        // Bind data to rank labels
        const rankLabels = svg.selectAll('.rank-label')
            .data(yearData.countries, d => d.country);
        
        // Exit old rank labels
        rankLabels.exit().remove();
        
        // Enter new rank labels
        const rankLabelsEnter = rankLabels.enter()
            .append('text')
            .attr('class', 'rank-label')
            .attr('x', -30)
            .attr('y', d => y(d.country) + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .text(d => `#${d.rank}`)
            .style('opacity', 0);
        
        // Update all rank labels
        rankLabelsEnter.merge(rankLabels)
            .transition()
            .duration(animationSpeed * 0.9)
            .attr('y', d => y(d.country) + y.bandwidth() / 2)
            .text(d => `#${d.rank}`)
            .style('opacity', 1)
            .style('font-weight', d => d.country === selectedCountry ? 'bold' : 'normal');
        
        // Bind data to country labels inside bars
        const countryLabels = svg.selectAll('.country-label')
            .data(yearData.countries, d => d.country);
        
        // Exit old labels
        countryLabels.exit().remove();
        
        // Enter new labels
        const countryLabelsEnter = countryLabels.enter()
            .append('text')
            .attr('class', 'country-label')
            .attr('x', 10) // Position inside the bar
            .attr('y', d => y(d.country) + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .text(d => d.country)
            .style('opacity', 0);
        
        // Update all labels
        countryLabelsEnter.merge(countryLabels)
            .transition()
            .duration(animationSpeed * 0.9)
            .attr('y', d => y(d.country) + y.bandwidth() / 2)
            .style('opacity', 1)
            .style('font-weight', d => d.country === selectedCountry ? 'bold' : 'normal');
        
        // Bind data to score labels
        const scoreLabels = svg.selectAll('.score-label')
            .data(yearData.countries, d => d.country);
        
        // Exit old score labels
        scoreLabels.exit().remove();
        
        // Enter new score labels
        const scoreLabelsEnter = scoreLabels.enter()
            .append('text')
            .attr('class', 'score-label')
            .attr('x', d => x(d.happiness_score) + 5)
            .attr('y', d => y(d.country) + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .text(d => d.happiness_score.toFixed(2))
            .style('opacity', 0);
        
        // Update all score labels
        scoreLabelsEnter.merge(scoreLabels)
            .transition()
            .duration(animationSpeed * 0.9)
            .attr('x', d => x(d.happiness_score) + 5)
            .attr('y', d => y(d.country) + y.bandwidth() / 2)
            .text(d => d.happiness_score.toFixed(2))
            .style('opacity', 1)
            .style('font-weight', d => d.country === selectedCountry ? 'bold' : 'normal');
    }

    // Function to start the animation
    function startAnimation() {
        if (isPlaying) return;
        
        isPlaying = true;
        
        function step() {
            // Go to next year or loop back to start
            currentYearIndex = (currentYearIndex + 1) % years.length;
            updateChart(currentYearIndex);
            
            // Schedule next frame
            animationTimer = setTimeout(step, animationSpeed);
        }
        
        // Start the loop
        animationTimer = setTimeout(step, animationSpeed);
    }

    // Function to pause the animation
    function pauseAnimation() {
        isPlaying = false;
        clearTimeout(animationTimer);
    }

    // Handle window resize
    window.addEventListener('resize', function() {
        // Only redraw if the chart exists
        if (data.length > 0) {
            // Clear the SVG
            d3.select('#leaderboard-chart svg').remove();
            
            // Recalculate dimensions
            const newWidth = document.getElementById('leaderboard-chart').clientWidth - margin.left - margin.right;
            const newHeight = document.getElementById('leaderboard-chart').clientHeight - margin.top - margin.bottom;
            
            // Create new SVG container
            svg = d3.select('#leaderboard-chart')
                .append('svg')
                .attr('width', newWidth + margin.left + margin.right)
                .attr('height', newHeight + margin.top + margin.bottom)
                .append('g')
                .attr('transform', `translate(${margin.left}, ${margin.top})`);
                
            // Update scales
            x.range([0, newWidth]);
            y.range([0, newHeight]);
            
            // Recreate axes
            xAxis = svg.append('g')
                .attr('class', 'axis x-axis')
                .attr('transform', `translate(0, ${newHeight})`)
                .call(d3.axisBottom(x).tickFormat(d => d.toFixed(1)));
                
            yAxis = svg.append('g')
                .attr('class', 'axis y-axis');
                
            // Add title
            svg.append('text')
                .attr('class', 'chart-title')
                .attr('x', newWidth / 2)
                .attr('y', -15)
                .attr('text-anchor', 'middle')
                .style('font-size', '16px')
                .style('font-weight', 'bold')
                .text('Top 20 Countries by Happiness Score');
                
            // Update chart
            updateChart(currentYearIndex);
            
            // Recreate the legend if needed
            createLegend();
        }
    });
}); 