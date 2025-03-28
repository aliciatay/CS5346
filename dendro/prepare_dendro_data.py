import pandas as pd
import json
import numpy as np
from scipy.cluster import hierarchy
from scipy.spatial.distance import pdist
import os

# Ensure the subfolder exists
os.makedirs('dendro/data', exist_ok=True)

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

print("Data prepared for D3 visualization and saved to dendro/data/ folder")