// Main visualization code
document.addEventListener('DOMContentLoaded', function() {
    // Define global variables
    let data = [];
    let years = [];
    let currentYearIndex = 0;
    let animationSpeed = 1000; // milliseconds between frames
    let isPlaying = false;
    let animationTimer;

    // Define color scale (Tableau-like colors)
    const colors = d3.scaleOrdinal()
        .range([
            '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', 
            '#59a14f', '#edc949', '#af7aa1', '#ff9da7', 
            '#9c755f', '#bab0ab', '#76b7b2', '#a0c8a0', 
            '#f1ce63', '#d37295', '#b9a0ba', '#bab0ab'
        ]);

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
            
            return {
                year: year,
                countries: top20
            };
        });

        console.log("Prepared data:", data);

        // Set the domain for scales based on all data
        const maxScore = d3.max(data, d => d3.max(d.countries, c => c.happiness_score));
        x.domain([0, maxScore * 1.1]); // Add 10% padding

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
        const yearData = data[yearIndex];
        document.getElementById('current-year').textContent = yearData.year;
        
        // Update y-scale domain
        y.domain(yearData.countries.map(d => d.country));
        
        // Update y-axis with animation
        yAxis.transition()
            .duration(animationSpeed * 0.9)
            .call(d3.axisLeft(y).tickSize(0).tickPadding(5));
        
        // Remove axis line
        yAxis.select('.domain').remove();
        
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
            .attr('fill', d => colors(d.country));
        
        // Update all bars
        barsEnter.merge(bars)
            .transition()
            .duration(animationSpeed * 0.9)
            .attr('y', d => y(d.country))
            .attr('width', d => x(d.happiness_score))
            .attr('fill', d => colors(d.country));
        
        // Bind data to country labels
        const countryLabels = svg.selectAll('.country-label')
            .data(yearData.countries, d => d.country);
        
        // Exit old labels
        countryLabels.exit().remove();
        
        // Enter new labels
        const countryLabelsEnter = countryLabels.enter()
            .append('text')
            .attr('class', 'country-label')
            .attr('x', 5)
            .attr('y', d => y(d.country) + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .text(d => d.country)
            .style('opacity', 0);
        
        // Update all labels
        countryLabelsEnter.merge(countryLabels)
            .transition()
            .duration(animationSpeed * 0.9)
            .attr('y', d => y(d.country) + y.bandwidth() / 2)
            .style('opacity', 1);
        
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
            .style('opacity', 1);
        
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
            .style('opacity', 1);
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
        }
    });
}); 