import os
import pandas as pd
import json
import numpy as np
from scipy.cluster import hierarchy
from scipy.spatial.distance import pdist

# Define the subfolder structure
folders = [
    'dendro',
    'dendro/data',
    'dendro/js',
    'dendro/css'
]

# Create folders if they don't exist
for folder in folders:
    os.makedirs(folder, exist_ok=True)
    print(f"Created folder: {folder}")

# Prepare data for visualization
print("Preparing data for visualization...")

# Load your correlation data
correlations = pd.read_csv('happiness_factor_correlations.csv')

# Filter for regional correlations
regional_corr = correlations[correlations['level'] == 'By Region']

# Create a pivot table for region-factor correlations
region_factor_matrix = regional_corr.pivot(
    index='region', 
    columns='factor', 
    values='correlation'
)

# Save this intermediate data for reference
region_factor_matrix.to_csv('dendro/data/region_factor_matrix.csv')

# Calculate the linkage matrix for hierarchical clustering
dist_matrix = pdist(region_factor_matrix.values)
linkage_matrix = hierarchy.linkage(dist_matrix, method='ward')

# Create dendrogram data
dendrogram = hierarchy.dendrogram(linkage_matrix, no_plot=True, labels=region_factor_matrix.index.tolist())

# Construct the hierarchical tree structure for D3
def get_nested_children(node_id, Z, labels):
    # Return a leaf node
    if node_id < len(labels):
        return {
            "name": labels[node_id],
            "value": 1,
            "correlation_data": region_factor_matrix.iloc[node_id].to_dict()
        }
    
    # Compute left and right child ids
    node_in_Z = node_id - len(labels)
    left_id = int(Z[node_in_Z, 0])
    right_id = int(Z[node_in_Z, 1])
    
    # Return an internal node with two children
    return {
        "name": f"Cluster {node_id}",
        "children": [
            get_nested_children(left_id, Z, labels),
            get_nested_children(right_id, Z, labels)
        ]
    }

# Get the root of the dendrogram
root = get_nested_children(2*len(region_factor_matrix.index)-2, linkage_matrix, region_factor_matrix.index.tolist())

# Save the hierarchical data as JSON
with open('dendro/data/region_hierarchy.json', 'w') as f:
    json.dump(root, f)

# Also save the factor data
factors_data = []
for factor in region_factor_matrix.columns:
    avg_corr = region_factor_matrix[factor].mean()
    factors_data.append({
        "name": factor,
        "average_correlation": float(avg_corr)
    })

# Sort factors by average correlation
factors_data.sort(key=lambda x: x["average_correlation"], reverse=True)

# Save factor data
with open('dendro/data/factors.json', 'w') as f:
    json.dump(factors_data, f)

print("Data prepared and saved to dendro/data/ folder")

# Create the CSS file
if not os.path.exists('dendro/css/style.css'):
    with open('dendro/css/style.css', 'w') as f:
        f.write('''body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f7f7f7;
    color: #333;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    background-color: white;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

h1, h2 {
    text-align: center;
    color: #1a5276;
}

h1 {
    margin-bottom: 5px;
}

h2 {
    font-weight: normal;
    margin-top: 0;
    margin-bottom: 30px;
    color: #5d6d7e;
}

.description {
    margin: 20px 0 30px;
    text-align: center;
    color: #5d6d7e;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.5;
}

#viz {
    display: flex;
    flex-direction: column;
    align-items: center;
}

svg {
    margin-top: 20px;
}

.node circle {
    fill: #fff;
    stroke: #1a5276;
    stroke-width: 2px;
    transition: fill 0.3s, r 0.3s;
}

.node:hover circle {
    fill: #a2d5f2;
    r: 6;
}

.node text {
    font-size: 11px;
    font-family: sans-serif;
    transition: font-size 0.3s;
}

.node:hover text {
    font-size: 14px;
    font-weight: bold;
}

.link {
    fill: none;
    stroke: #d6dbdf;
    stroke-width: 1.5px;
    transition: stroke 0.3s;
}

.node:hover + .link {
    stroke: #7fb3d5;
}

.factor-legend {
    margin-top: 40px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
}

.factor-item {
    display: flex;
    align-items: center;
    padding: 8px 15px;
    border-radius: 20px;
    background-color: #f5f8fa;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    transition: transform 0.2s, box-shadow 0.2s;
}

.factor-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.factor-color {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-right: 8px;
}

.tooltip {
    position: absolute;
    padding: 15px;
    background-color: rgba(255, 255, 255, 0.97);
    border: 1px solid #e5e8e8;
    border-radius: 8px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s;
    box-shadow: 0 4px 15px rgba(0,0,0,0.15);
    max-width: 320px;
}

.tooltip h3 {
    margin: 0 0 12px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid #eaeded;
    color: #1a5276;
}

.radar-chart {
    margin-top: 15px;
}

.back-link {
    display: block;
    margin: 30px auto 0;
    text-align: center;
    color: #1a5276;
    text-decoration: none;
    font-weight: 500;
}

.back-link:hover {
    text-decoration: underline;
}

.legend-title {
    width: 100%;
    text-align: center;
    margin: 10px 0;
    font-weight: 600;
    color: #34495e;
}

footer {
    margin-top: 40px;
    text-align: center;
    font-size: 14px;
    color: #7f8c8d;
}

footer a {
    color: #2980b9;
    text-decoration: none;
}

footer a:hover {
    text-decoration: underline;
}''')
    print("Created CSS file")

# Create the HTML file
if not os.path.exists('dendro/index.html'):
    with open('dendro/index.html', 'w') as f:
        f.write('''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>World Happiness Factors - Radial Dendrogram</title>
    <link rel="stylesheet" href="css/style.css">
    <script src="https://d3js.org/d3.v7.min.js"></script>
</head>
<body>
    <div class="container">
        <h1>World Happiness Factors</h1>
        <h2>Which factors consistently influence happiness across regions?</h2>
        
        <div class="description">
            <p>This radial dendrogram visualizes how different regions cluster based on the correlation patterns between happiness factors and overall happiness scores.</p>
            <p>Regions grouped together have similar patterns in what influences their happiness. <strong>Hover over any region</strong> to see detailed factor correlations and a radar chart visualization.</p>
        </div>
        
        <div id="viz">
            <!-- Visualization will be generated here -->
        </div>
        
        <div class="factor-legend" id="legend">
            <!-- Factor legend will be generated here -->
        </div>
        
        <a href="../" class="back-link">← Back to World Happiness Analysis</a>
        
        <footer>
            <p>Data Source: World Happiness Report 2015-2023 | Created for <a href="https://aliciatay.github.io/CS5346/" target="_blank">CS5346 Information Visualization</a></p>
        </footer>
    </div>
    
    <script src="js/dendrogram.js"></script>
</body>
</html>''')
    print("Created HTML file")

# Create the JavaScript file
if not os.path.exists('dendro/js/dendrogram.js'):
    with open('dendro/js/dendrogram.js', 'w') as f:
        f.write('''// Set up dimensions for the visualization
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
});''')
    print("Created JavaScript file")

print("\nSetup complete! Open dendro/index.html in your browser to view the visualization.")
print("To upload to GitHub, add and commit the dendro folder to your repository.")