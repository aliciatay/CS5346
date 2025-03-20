// Set up dimensions
const margin = { top: 40, right: 120, bottom: 60, left: 80 };  // Increased left margin for axis label
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Create SVG container
const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("display", "block")  // Center the SVG
    .style("margin", "auto")    // Center the SVG
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Add tooltip
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Platform colors
const platformColors = {
    "Spotify": "#1DB954",
    "YouTube": "#FF0000",
    "TikTok": "#000000",
    "Deezer": "#FF0092",
    "Amazon": "#00A8E1"
};

// Success categories
const successCategories = ["Hit", "Non-Hit"];

// Function to create gradient color for hits
function createGradient(svg) {
    // Define gradient
    const gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "hit-gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");

    // Add colors to gradient
    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", platformColors.Spotify);
    gradient.append("stop")
        .attr("offset", "25%")
        .attr("stop-color", platformColors.YouTube);
    gradient.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", platformColors.TikTok);
    gradient.append("stop")
        .attr("offset", "75%")
        .attr("stop-color", platformColors.Deezer);
    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", platformColors.Amazon);

    return "url(#hit-gradient)";
}

// Function to update the chart
async function updateChart() {
    // Clear existing content
    svg.selectAll("*").remove();
    d3.select("#error-message").style("display", "none");

    // Create gradient
    const hitColor = createGradient(svg);

    try {
        // Get selected feature
        const selectedFeature = document.getElementById("feature-select").value;

        // Load and process data
        const data = await d3.csv("final_df_cleaned.csv");
        
        // Process data to get average feature values for successful/unsuccessful songs per platform
        const platforms = ["Spotify", "YouTube", "TikTok", "Deezer", "Amazon"];
        const processedData = [];

        platforms.forEach(platform => {
            const platformData = {
                platform: platform,
                successful: {},
                unsuccessful: {}
            };

            // Use platform-specific Hit indicator
            const hitColumn = `${platform}_Hit`;
            
            // Split songs into hits and non-hits based on Hit indicator
            const successfulSongs = data.filter(d => d[hitColumn] === 'True');
            const unsuccessfulSongs = data.filter(d => d[hitColumn] === 'False');

            // Calculate average feature values
            platformData.successful[selectedFeature] = d3.mean(successfulSongs, d => +d[selectedFeature]) || 0;
            platformData.unsuccessful[selectedFeature] = d3.mean(unsuccessfulSongs, d => +d[selectedFeature]) || 0;

            processedData.push(platformData);
        });

        // Set up scales
        const x0 = d3.scaleBand()
            .domain(platforms)
            .range([0, width])
            .padding(0.1);

        const x1 = d3.scaleBand()
            .domain(successCategories)
            .range([0, x0.bandwidth()])
            .padding(0.05);

        const y = d3.scaleLinear()
            .domain([0, d3.max(processedData, d => 
                Math.max(d.successful[selectedFeature], d.unsuccessful[selectedFeature])
            ) * 1.1])
            .range([height, 0]);

        // Add X axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x0))
            .selectAll("text")
            .style("text-anchor", "middle");

        // Add X axis label
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 10)
            .style("text-anchor", "middle")
            .attr("class", "axis-label")
            .text("Platforms");

        // Add Y axis
        svg.append("g")
            .call(d3.axisLeft(y));

        // Add Y axis label
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left + 20)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .attr("class", "axis-label")
            .text(`Average ${selectedFeature.charAt(0).toUpperCase() + selectedFeature.slice(1)} Value`);

        // Add bars
        const platformGroups = svg.selectAll(".platform-group")
            .data(processedData)
            .join("g")
            .attr("class", "platform-group")
            .attr("transform", d => `translate(${x0(d.platform)},0)`);

        // Add bars for hits and non-hits
        platformGroups.selectAll("rect")
            .data(d => [
                { category: "Hit", value: d.successful[selectedFeature] },
                { category: "Non-Hit", value: d.unsuccessful[selectedFeature] }
            ])
            .join("rect")
            .attr("x", d => x1(d.category))
            .attr("y", d => y(d.value))
            .attr("width", x1.bandwidth())
            .attr("height", d => height - y(d.value))
            .attr("fill", (d, i) => i === 0 ? hitColor : "#cccccc")
            .on("mouseover", function(event, d) {
                const platformData = d3.select(this.parentNode).datum();
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`
                    Platform: ${platformData.platform}<br/>
                    Category: ${d.category}<br/>
                    ${selectedFeature}: ${d.value.toFixed(3)}
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        // Add legend
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width + 10}, 0)`);

        // Hit/Non-Hit legend
        const legendItems = legend.selectAll(".legend-item")
            .data(["Hit", "Non-Hit"])
            .join("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(0,${i * 20})`);

        legendItems.append("rect")
            .attr("x", 0)
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", (d, i) => i === 0 ? hitColor : "#cccccc");

        legendItems.append("text")
            .attr("x", 24)
            .attr("y", 9)
            .attr("dy", ".35em")
            .text(d => d);

    } catch (error) {
        console.error("Error loading or processing data:", error);
        d3.select("#error-message").style("display", "block");
    }
}

// Initial chart
updateChart();

// Add event listener for feature selection
d3.select("#feature-select").on("change", updateChart); 