// Define region of interest
var upzla=table.filter(ee.Filter.eq("ADM3_EN","Boalkhali"))

// // Load Sentinel-2 image collection
var img=ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(upzla)
        .filterDate("2025-01-01","2025-11-01")
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',5))
        .median()
        .clip(upzla);

// // Select bands for clustering
var bands=['B2','B3','B4','B8']
var image=img.select(bands)
// Map.centerObject(upzla)
Map.addLayer(image,imageVisParam,"Sentinel-2 RGB")
Map.addLayer(image,imageVisParam2,"Sentinel-2 False-color")



/////////////////////////////////////////////
//////////UNSUPERVISED_CLASSIFICATION//////////
/////////////////////////////////////////////
// Sample the image
var training=image.sample({
  region:upzla,
  scale:10,
  numPixels:5000
})
print(training)

// Instantiate the clusterer and train it
var clusterer=ee.Clusterer.wekaKMeans(5).train(training)
var result=image.cluster(clusterer)
print(result)
Map.addLayer(result.randomVisualizer(),{},"K-means cluster")

/////////////////////////////////////////////
//////////SUPERVISED_CLASSIFICATION//////////
/////////////////////////////////////////////

// Merge the feature collection
var trainingData=vegetation.merge(waterbody).merge(cropland).merge(settlement).merge(bareland)
print(trainingData)

// Sample the imagery to get a FeatureCollection of training data
var training=image.sampleRegions({
  collection:trainingData,
  properties:['landcover'],
  scale:10
})
print(training)

// Train a classifier
var classifier=ee.Classifier.smileRandomForest(50).train({
  features:training,      
  classProperty:'landcover',
  inputProperties:image.bandNames()
})

// Classify the image
var classified=image.classify(classifier)

// Define the visualization parametersvar
var visParams={
  min:0,
  max:4,
  palette: ['green','blue','cyan','red','yellow']}

// Add layers to the map
Map.addLayer(classified,visParams,"Supervised image")

////////////////////////////////////////////////
///////////Ground truthing and accuracy ////////
////////////////////////////////////////////////


var agri = ee.FeatureCollection([
  	ee.Feature(ee.Geometry.Point([91.983553, 22.405572]), {landcover: 2}),
  	ee.Feature(ee.Geometry.Point([91.969682, 22.391767]), {landcover: 2}),
  	ee.Feature(ee.Geometry.Point([91.991578, 22.379062]), {landcover: 2}),
  	ee.Feature(ee.Geometry.Point([91.978925, 22.353422]), {landcover: 2}),
  	ee.Feature(ee.Geometry.Point([91.936434, 22.364109]), {landcover: 2}),
  	ee.Feature(ee.Geometry.Point([91.893432, 22.364484]), {landcover: 2})])

var settle = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([91.984982, 22.375292]),{ landcover: 3 }),
  ee.Feature(ee.Geometry.Point([91.9808419, 22.3735924]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([91.887556, 22.370119]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([91.890929, 22.386568]), {landcover: 3} ),
  ee.Feature(ee.Geometry.Point([91.890608, 22.392342]), {landcover: 3} ),
  ee.Feature(ee.Geometry.Point([91.987422, 22.39407]), {landcover: 3} )])
  	
  	  
var water = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([91.980272, 22.365915 ]),  {landcover: 1} ),
  ee.Feature(ee.Geometry.Point([91.975503, 22.36619 ]), {landcover: 1} ),
  ee.Feature(ee.Geometry.Point([91.995651, 22.376485 ]), {landcover: 1} ),
  ee.Feature(ee.Geometry.Point([91.973762, 22.375858 ]),  {landcover: 1} ),
  ee.Feature(ee.Geometry.Point([91.987291, 22.374301]), {landcover: 1} ),
  ee.Feature(ee.Geometry.Point([91.980009, 22.368744 ]), {landcover: 1} ),
  ee.Feature(ee.Geometry.Point([91.988141, 22.368466 ]), {landcover: 1} ),
  ee.Feature(ee.Geometry.Point([91.99018, 22.370163 ]), {landcover: 1} ),
  ee.Feature(ee.Geometry.Point([91.994475, 22.365673]), {landcover: 1} ),
  ee.Feature(ee.Geometry.Point([91.966718, 22.363373 ]),  {landcover: 1} ),
  ee.Feature(ee.Geometry.Point([91.966718, 22.363373 ]), {landcover: 1} ),
  ee.Feature(ee.Geometry.Point([91.962158, 22.350461]), {landcover: 1} ),
    ])
var veg = ee.FeatureCollection([
 ee.Feature(ee.Geometry.Point([  91.9648 ,22.373813  ]),  {landcover: 0 }),
 ee.Feature(ee.Geometry.Point([   91.957929, 22.373761  ]), {landcover: 0 }),
 ee.Feature(ee.Geometry.Point([   91.973653, 22.385242 ]), {landcover: 0 }),
 ee.Feature(ee.Geometry.Point([  91.982146, 22.384711 ]), {landcover: 0 }),
 ee.Feature(ee.Geometry.Point([92.00787, 22.38184]), {landcover: 0 }),
 ee.Feature(ee.Geometry.Point([92.004635, 22.390026]),  {landcover: 0 })])

var barren = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([92.000991, 22.378241]),{landcover:4}),
  ee.Feature(ee.Geometry.Point([91.9955359, 22.3755976]),{landcover:4}),
  ee.Feature(ee.Geometry.Point([91.901653, 22.35472]),{landcover:4}),
  ee.Feature(ee.Geometry.Point([91.886319, 22.356339]),{landcover:4}),
  ee.Feature(ee.Geometry.Point([91.886131, 22.353322]),{landcover:4})
  ]);

var mergedGroundPoints = agri.merge(settle).merge(water).merge(veg).merge(barren)
print(mergedGroundPoints)
Map.addLayer(mergedGroundPoints)

var validation = image.sampleRegions({
  collection: mergedGroundPoints,
  properties: ['landcover'],
  scale: 10,
});

var test = validation.classify(classifier);

var testConfusionMatrix = test.errorMatrix('landcover', 'classification')

print('Confusion Matrix', testConfusionMatrix);
print('Test Accuracy', testConfusionMatrix.accuracy())
print('kappa', testConfusionMatrix.kappa());
