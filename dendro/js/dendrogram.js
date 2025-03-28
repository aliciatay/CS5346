// Set up dimensions for the visualization
const width = 900;
const height = 900;
const radius = width / 2 - 160;

// Create SVG container with a responsive viewBox
const svg = d3.select("#viz")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("style", "max-width: 100%; height: auto;")
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

// Create a tooltip
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");

// Add visualization title as a centered annotation
svg.append("text")
    .attr("x", 0)
    .attr("y", -height/2 + 30)
    .attr("text-anchor", "middle")
    .attr("class", "viz-title")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .style("fill", "#1a5276")
    .text("Regional Clusters by Happiness Factor Influence");

// Load data files
Promise.all([
    d3.json("data/region_hierarchy.json"),
    d3.json("data/factors.json")
]).then(([hierarchyData, factorsData]) => {
    // Process the hierarchical data
    const root = d3.hierarchy(hierarchyData);
    
    // Set up cluster layout
    const cluster = d3.cluster()
        .size([360, radius]);
    
    // Configure the radial layout
    cluster(root);
    
    // Create a color scale for factors using a custom color scheme for better differentiation
    const colorScale = d3.scaleOrdinal()
        .domain(factorsData.map(d => d.name))
        .range(["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f", "#edc949"]);
    
    // Add links between nodes
    svg.selectAll("path.link")
        .data(root.links())
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", d => {
            return `M${project(d.source.x, d.source.y)}
                    C${project(d.source.x, (d.source.y + d.target.y) / 2)}
                    ${project(d.target.x, (d.source.y + d.target.y) / 2)}
                    ${project(d.target.x, d.target.y)}`;
        });
    
    // Add nodes
    const node = svg.selectAll(".node")
        .data(root.descendants())
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${project(d.x, d.y)})`);
    
    // Add circles to nodes
    node.append("circle")
        .attr("r", d => d.children ? 3 : 5)
        .style("fill", d => d.children ? "#fff" : "#1a5276");
    
    // Add labels to leaf nodes
    node.filter(d => !d.children)
        .append("text")
        .attr("dy", "0.31em")
        .attr("x", d => d.x < 180 ? 8 : -8)
        .attr("text-anchor", d => d.x < 180 ? "start" : "end")
        .attr("transform", d => `rotate(${d.x < 180 ? d.x - 90 : d.x + 90})`)
        .text(d => d.data.name)
        .style("font-size", "12px")
        .on("mouseover", function(event, d) {
            d3.select(this).style("font-weight", "bold");
            showTooltip(event, d);
        })
        .on("mouseout", function() {
            d3.select(this).style("font-weight", "normal");
            tooltip.style("opacity", 0);
        });
    
    // Create factor legend
    createFactorLegend(factorsData, colorScale);
    
    // Function to display the tooltip with radar chart
    function showTooltip(event, d) {
        if (!d.data.correlation_data) return;
        
        // Position the tooltip
        tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 20) + "px")
            .style("opacity", 1);
        
        // Clear previous content
        tooltip.html("");
        
        // Add region name
        tooltip.append("h3")
            .text(d.data.name);
        
        // Create a small table of correlations
        const table = tooltip.append("table")
            .style("border-collapse", "collapse")
            .style("width", "100%")
            .style("margin-bottom", "15px");
        
        const thead = table.append("thead");
        thead.append("tr")
            .append("th")
            .attr("colspan", 2)
            .style("text-align", "center")
            .style("border-bottom", "1px solid #ddd")
            .style("padding-bottom", "5px")
            .text("Happiness Factor Correlations");
        
        const tbody = table.append("tbody");
        
        // Sort factors by absolute correlation value
        const sortedFactors = factorsData
            .map(f => f.name)
            .sort((a, b) => Math.abs(d.data.correlation_data[b]) - Math.abs(d.data.correlation_data[a]));
        
        sortedFactors.forEach(factor => {
            const row = tbody.append("tr");
            
            // Format the factor name to be more readable
            const formattedFactor = factor
                .split("_")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");
            
            row.append("td")
                .style("padding", "5px 10px 5px 3px")
                .style("border-bottom", "1px solid #eee")
                .text(formattedFactor);
            
            const corrValue = d.data.correlation_data[factor];
            
            row.append("td")
                .style("padding", "5px")
                .style("text-align", "right")
                .style("border-bottom", "1px solid #eee")
                .style("font-weight", "bold")
                .style("color", corrValue > 0 ? "#2a9d8f" : "#e76f51")
                .text(corrValue.toFixed(3) + (corrValue > 0 ? " ↑" : " ↓"));
        });
        
        // Add a radar chart
        const chartWidth = 250;
        const chartHeight = 250;
        const chartRadius = Math.min(chartWidth, chartHeight) / 2 - 30;
        
        const radarSvg = tooltip.append("div")
            .attr("class", "radar-chart")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .append("g")
            .attr("transform", `translate(${chartWidth / 2},${chartHeight / 2})`);
        
        // Create radar chart scales and axes
        const angleScale = d3.scalePoint()
            .domain(sortedFactors)
            .range([0, Math.PI * 2]);
        
        const radiusScale = d3.scaleLinear()
            .domain([-1, 1])
            .range([0, chartRadius]);
        
        // Draw radar chart axes
        sortedFactors.forEach(factor => {
            const angle = angleScale(factor);
            
            // Draw axis line
            radarSvg.append("line")
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", chartRadius * Math.sin(angle))
                .attr("y2", -chartRadius * Math.cos(angle))
                .style("stroke", "#ddd")
                .style("stroke-width", 1);
            
            // Format the factor name for display
            const formattedFactor = factor
                .split("_")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");
            
            // Draw axis label
            radarSvg.append("text")
                .attr("x", (chartRadius + 10) * Math.sin(angle))
                .attr("y", -(chartRadius + 10) * Math.cos(angle))
                .attr("text-anchor", "middle")
                .attr("dy", "0.35em")
                .style("font-size", "9px")
                .text(formattedFactor);
        });
        
        // Draw radar chart circles
        const circles = [-0.5, 0, 0.5];
        circles.forEach(value => {
            radarSvg.append("circle")
                .attr("cx", 0)
                .attr("cy", 0)
                .attr("r", radiusScale(value))
                .style("fill", "none")
                .style("stroke", "#ddd")
                .style("stroke-dasharray", value === 0 ? "none" : "3,3");
            
            // Label for the circle
            radarSvg.append("text")
                .attr("x", 0)
                .attr("y", -radiusScale(value))
                .attr("dy", "-0.3em")
                .attr("text-anchor", "middle")
                .style("font-size", "8px")
                .text(value.toFixed(1));
        });
        
        // Draw the radar path
        const radarLine = d3.lineRadial()
            .angle(d => angleScale(d))
            .radius(d => radiusScale(d.data.correlation_data[d.factor]));
        
        const points = sortedFactors.map(factor => ({
            factor: factor,
            data: d.data
        }));
        
        radarSvg.append("path")
            .datum(points)
            .attr("d", radarLine)
            .style("fill", "rgba(26, 82, 118, 0.3)")
            .style("stroke", "#1a5276")
            .style("stroke-width", 2);
        
        // Add points at each data point
        points.forEach(point => {
            const angle = angleScale(point.factor);
            const radius = radiusScale(point.data.correlation_data[point.factor]);
            
            radarSvg.append("circle")
                .attr("cx", radius * Math.sin(angle))
                .attr("cy", -radius * Math.cos(angle))
                .attr("r", 4)
                .style("fill", colorScale(point.factor))
                .style("stroke", "white")
                .style("stroke-width", 1);
        });
    }
    
    // Function to create the factor legend
    function createFactorLegend(factorsData, colorScale) {
        const legend = d3.select("#legend");
        
        // Add title
        legend.append("div")
            .attr("class", "legend-title")
            .text("Average Correlation with Happiness Score");
        
        // Add legend items
        factorsData.forEach(factor => {
            const legendItem = legend.append("div")
                .attr("class", "factor-item");
            
            legendItem.append("div")
                .attr("class", "factor-color")
                .style("background-color", colorScale(factor.name));
            
            // Format the factor name for display
            const formattedFactor = factor.name
                .split("_")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");
            
            const corrValue = factor.average_correlation;
            legendItem.append("span")
                .html(`${formattedFactor}: <strong style="color: ${corrValue > 0 ? '#2a9d8f' : '#e76f51'}">
                       ${corrValue.toFixed(3)}</strong>`);
        });
    }
    
    // Helper function to convert polar coordinates to Cartesian
    function project(angle, radius) {
        const a = (angle - 90) / 180 * Math.PI;
        return [radius * Math.cos(a), radius * Math.sin(a)];
    }
});