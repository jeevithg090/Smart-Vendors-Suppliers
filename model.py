import json
import numpy as np
from typing import List, Dict

# Load mock data from JSON
with open('mockdata.json', 'r') as f:
    data = json.load(f)

vendors = data['vendors']
suppliers = data['suppliers']
ratings = data['ratings']

# Build user-item matrix (vendors x suppliers)
vendor_ids = [v['userId'] for v in vendors]
supplier_ids = [s['userId'] for s in suppliers]

vendor_idx = {uid: i for i, uid in enumerate(vendor_ids)}
supplier_idx = {uid: i for i, uid in enumerate(supplier_ids)}

matrix = np.zeros((len(vendor_ids), len(supplier_ids)))
for r in ratings:
    v = r['fromId']
    s = r['toId']
    score = r['score']
    if v in vendor_idx and s in supplier_idx:
        matrix[vendor_idx[v], supplier_idx[s]] = score

def recommend_suppliers_for_vendor(vendor_id: str, top_n: int = 3) -> List[Dict]:
    if vendor_id not in vendor_idx:
        return []
    # Collaborative filtering: find similar vendors
    vendor_vector = matrix[vendor_idx[vendor_id]]
    similarities = matrix @ vendor_vector
    # Exclude self
    similarities[vendor_idx[vendor_id]] = 0
    # Aggregate supplier scores from similar vendors
    supplier_scores = matrix.T @ similarities
    # Recommend top N suppliers not already rated by this vendor
    already_rated = set(np.where(vendor_vector > 0)[0])
    recommendations = [
        (supplier_ids[i], supplier_scores[i])
        for i in np.argsort(-supplier_scores)
        if i not in already_rated
    ]
    # Return supplier details
    result = []
    for sid, score in recommendations[:top_n]:
        supplier = next((s for s in suppliers if s['userId'] == sid), None)
        if supplier:
            result.append({'supplier': supplier, 'score': float(score)})
    return result

if __name__ == '__main__':
    # Example usage
    test_vendor = vendor_ids[0]
    recs = recommend_suppliers_for_vendor(test_vendor)
    print(f'Recommendations for vendor {test_vendor}:')
    for rec in recs:
        print(f"Supplier: {rec['supplier']['name']}, Score: {rec['score']}") 