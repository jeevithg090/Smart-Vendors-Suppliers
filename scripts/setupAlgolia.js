const algoliasearch = require('algoliasearch');
const { mockVendors } = require('../src/data/mockVendors');

// Load environment variables
require('dotenv').config();

const appId = process.env.REACT_APP_ALGOLIA_APP_ID;
const adminKey = process.env.REACT_APP_ALGOLIA_ADMIN_KEY;
const indexName = process.env.REACT_APP_ALGOLIA_INDEX_NAME || 'vendors';

if (!appId || !adminKey) {
  console.error('❌ Missing Algolia credentials. Please check your .env file.');
  console.error('Required: REACT_APP_ALGOLIA_APP_ID and REACT_APP_ALGOLIA_ADMIN_KEY');
  process.exit(1);
}

const client = algoliasearch(appId, adminKey);
const index = client.initIndex(indexName);

async function populateAlgolia() {
  try {
    console.log('🚀 Starting Algolia population...');
    
    // Prepare vendors with proper Algolia format
    const vendorsWithGeo = mockVendors.map((vendor, index) => ({
      objectID: `vendor-${index + 1}`,
      ...vendor,
      _geoloc: {
        lat: vendor.location.lat,
        lng: vendor.location.lng
      },
      // Convert dates to timestamps for Algolia
      createdAt: vendor.createdAt.getTime(),
      updatedAt: vendor.updatedAt.getTime()
    }));

    console.log(`📦 Adding ${vendorsWithGeo.length} vendors to Algolia...`);
    
    // Save objects to Algolia
    const result = await index.saveObjects(vendorsWithGeo);
    
    console.log('✅ Successfully populated Algolia index!');
    console.log(`📊 Added ${result.objectIDs.length} vendors`);
    console.log(`🔗 Index: ${indexName}`);
    
    // Configure search settings
    console.log('⚙️ Configuring search settings...');
    
    await index.setSettings({
      searchableAttributes: [
        'name',
        'description',
        'tags',
        'category'
      ],
      attributesForFaceting: [
        'tags',
        'category',
        'isVerified',
        'isFastDelivery'
      ],
      customRanking: [
        'desc(rating)',
        'desc(reviewCount)'
      ],
      geoLoc: '_geoloc'
    });
    
    console.log('✅ Search settings configured!');
    console.log('\n🎉 Your Algolia index is ready to use!');
    console.log('\nNext steps:');
    console.log('1. Start your React app: npm start');
    console.log('2. Test the search functionality');
    console.log('3. Try the filters and location-based search');
    
  } catch (error) {
    console.error('❌ Error populating Algolia:', error);
    process.exit(1);
  }
}

// Run the population script
populateAlgolia();
