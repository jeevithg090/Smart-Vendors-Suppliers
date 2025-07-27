import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors
import json

# Step 1: Load or Generate Mock Data (with sparsity for demonstration)
# If you have 'mockdata.json', load it; otherwise, generate sparse data
try:
    jsondata = pd.read_json('mockdata.json')
    ratings_df = pd.DataFrame(jsondata)
    print("Loaded data from mockdata.json")
except FileNotFoundError:
    # Generate sparse mock data if file not found
    print("mockdata.json not found; generating sparse mock data")
    np.random.seed(42)
    num_vendors = 10
    num_suppliers = 5
    params = ["freshness_rating", "rejection_rate", "on_time_delivery", "fulfillment_accuracy", "value_for_money", "customer_support"]

    vendor_ratings = []
    for v in range(1, num_vendors + 1):
        for s in range(1, num_suppliers + 1):
            # Randomly make ~40% ratings missing (set to NaN)
            if np.random.rand() < 0.4:
                continue  # Skip to create sparsity
            ratings = {
                "freshness_rating": np.clip(np.random.normal(4, 0.5), 1, 5),
                "rejection_rate": np.clip(5 - np.random.normal(1, 0.3), 1, 5),  # Inverse scale
                "on_time_delivery": np.clip(np.random.normal(4, 0.7), 1, 5),
                "fulfillment_accuracy": np.clip(np.random.normal(4, 0.5), 1, 5),
                "value_for_money": np.clip(np.random.normal(4, 0.7), 1, 5),
                "customer_support": np.clip(np.random.normal(3.5, 0.8), 1, 5),
            }
            avg_rating = np.mean(list(ratings.values())) if ratings else np.nan
            vendor_ratings.append({"vendor_id": f"V{v}", "supplier_id": f"S{s}", "rating": avg_rating, **ratings})

    ratings_df = pd.DataFrame(vendor_ratings)

# Step 2: Create user-item matrix (keep NaN for missing ratings)
user_item_matrix = ratings_df.pivot(index='vendor_id', columns='supplier_id', values='rating')  # No fillna(0)!
print("User-Item Matrix (with sparsity):\n", user_item_matrix.head(20))

# Step 3: Fit KNN on the matrix (using cosine similarity, handling NaNs implicitly via masking if needed)
# For simplicity, fill NaNs temporarily with 0 for fitting, but we'll handle predictions carefully
matrix_for_fit = user_item_matrix.fillna(0)  # Temporary for KNN fit (cosine ignores zeros somewhat, but not perfect)
knn = NearestNeighbors(metric='cosine', algorithm='brute', n_neighbors=3, n_jobs=-1)
knn.fit(matrix_for_fit.values)

# Step 4: Updated Prediction Function (fills missing ratings based on similar vendors)
def predict_ratings(vendor_id):
    if vendor_id not in user_item_matrix.index:
        raise ValueError(f"Vendor {vendor_id} not found in data.")
    
    vendor_index = user_item_matrix.index.get_loc(vendor_id)
    distances, indices = knn.kneighbors(matrix_for_fit.iloc[vendor_index, :].values.reshape(1, -1))
    
    # Get the target vendor's ratings
    target_ratings = user_item_matrix.iloc[vendor_index]
    
    # Identify unrated suppliers (NaN)
    unrated_suppliers = target_ratings[target_ratings.isna()].index
    
    # Global average as fallback
    global_avg = user_item_matrix.stack().mean()
    
    pred_ratings = {}
    for supplier in unrated_suppliers:
        # Get neighbors' ratings for this supplier (ignore if NaN)
        neighbors_ratings = user_item_matrix.iloc[indices[0]][supplier].dropna()
        if neighbors_ratings.empty:
            pred_ratings[supplier] = global_avg  # Fallback if no neighbor data
            continue
        
        # Weights: similarity (1 - distance) for neighbors with ratings
        valid_indices = indices[0][:len(neighbors_ratings)]  # Align with available ratings
        weights = (1 - distances[0][valid_indices])
        weights = weights / weights.sum() if weights.sum() > 0 else weights
        
        # Weighted average
        predicted = np.dot(weights, neighbors_ratings)
        pred_ratings[supplier] = predicted
    
    return dict(sorted(pred_ratings.items(), key=lambda item: item[1], reverse=True))

# Example: Predict missing ratings for vendor V1
predicted_ratings_v1 = predict_ratings('V1')

# Step 5: Export to JSON
vendor_ratings_json = ratings_df.to_dict(orient='records')

predicted_ratings_json = [{"vendor_id": "V1", "supplier_id": k, "predicted_rating": v} for k, v in predicted_ratings_v1.items()]

with open('vendor_ratings_mock.json', 'w') as f:
    json.dump(vendor_ratings_json, f, indent=4)

with open('predicted_ratings_v1.json', 'w') as f:
    json.dump(predicted_ratings_json, f, indent=4)

# Print previews
print("First 5 mock ratings:", vendor_ratings_json[:5])
print("Predicted missing ratings for V1:", predicted_ratings_json)
