// Set the dimensions and margins of the visualization
const margin = {top: 30, right: 50, bottom: 30, left: 50};
const width = 1100 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Create the SVG container
const svg = d3.select("#visualization")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Load the data
d3.csv("final_df_cleaned.csv").then(function(data) {
    // Process the data
    const processedData = data.map(d => {
        // Calculate if song is a hit (5 or more platforms)
        const hitCount = [
            d.Spotify_Hit === "True",
            d.YouTube_Hit === "True",
            d.TikTok_Hit === "True",
            d.Apple_Music_Hit === "True",
            d.SiriusXM_Hit === "True",
            d.Deezer_Hit === "True",
            d.Amazon_Hit === "True",
            d.Pandora_Hit === "True",
            d.Shazam_Hit === "True"
        ].filter(Boolean).length;

        return {
            track_name: d.track_name,
            isHit: hitCount >= 5,
            danceability: +d.danceability,
            energy: +d.energy,
            valence: +d.valence,
            tempo: +d.tempo_x,
            loudness: +d.loudness,
            acousticness: +d.acousticness,
            instrumentalness: +d.instrumentalness,
            beat_strength: +d.beat_strength,
            harmonic_to_percussive: +d.harmonic_to_percussive_ratio
        };
    });

    // Define the features to display
    const features = [
        "danceability",
        "energy",
        "valence",
        "tempo",
        "loudness",
        "acousticness",
        "instrumentalness",
        "beat_strength",
        "harmonic_to_percussive"
    ];

    // Create scales for each feature
    const scales = {};
    features.forEach(feature => {
        scales[feature] = d3.scaleLinear()
            .domain(d3.extent(processedData, d => d[feature]))
            .range([height, 0]);
    });

    // Create axes
    const axes = {};
    features.forEach((feature, i) => {
        const x = (width / (features.length - 1)) * i;
        
        // Add axis
        axes[feature] = svg.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(${x},0)`)
            .call(d3.axisLeft(scales[feature]));

        // Add feature label
        svg.append("text")
            .attr("class", "axis-label")
            .attr("transform", `translate(${x},${height + margin.bottom})`)
            .attr("text-anchor", "middle")
            .text(feature.replace(/_/g, " "));
    });

    // Create the lines
    const line = d3.line()
        .defined(d => !isNaN(d))
        .x((d, i) => (width / (features.length - 1)) * i)
        .y(d => scales[features[i]](d));

    // Draw the lines
    processedData.forEach(d => {
        const values = features.map(f => d[f]);
        svg.append("path")
            .datum(values)
            .attr("class", `line ${d.isHit ? "hit" : "non-hit"}`)
            .attr("d", line)
            .append("title")
            .text(d.track_name);
    });

    // Add brushing functionality
    features.forEach((feature, i) => {
        const x = (width / (features.length - 1)) * i;
        
        const brush = d3.brushY()
            .extent([[x - 10, 0], [x + 10, height]])
            .on("brush", brushed);

        svg.append("g")
            .attr("class", "brush")
            .attr("transform", `translate(${x},0)`)
            .call(brush);
    });

    // Brushing function
    function brushed(event) {
        if (!event.selection) return;

        const [y0, y1] = event.selection.map(scales[features[Math.floor(event.target.__data__.x / (width / (features.length - 1)))]]));
        
        svg.selectAll(".line")
            .style("opacity", function(d) {
                const featureIndex = Math.floor(event.target.__data__.x / (width / (features.length - 1)));
                const value = d[featureIndex];
                return value >= y0 && value <= y1 ? 1 : 0.1;
            });
    }
}); 