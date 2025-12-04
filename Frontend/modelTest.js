const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');

// ==============================================================
// CONFIGURATION
// ==============================================================
const PATH_TO_IMAGE = 'C:/Users/shanessa/Downloads/20250918_1640_Ghibli Style Transformation_remix_01k5em5ynfex3sf0jxy81rksx7.png';
const MODEL_DIR = './my_tfjs_models';

async function loadAndPredict() {
    console.log("🚀 Starting Model Test...\n");

    // 1. Read the Image from Disk
    if (!fs.existsSync(PATH_TO_IMAGE)) {
        console.error(`❌ Image not found at: ${PATH_TO_IMAGE}`);
        return;
    }
    const imageBuffer = fs.readFileSync(PATH_TO_IMAGE);
    
    // Decode image to Tensor (3 channels, RGB)
    let rawTensor = tf.node.decodeImage(imageBuffer, 3);
    console.log(`📸 Image loaded. Original Shape: ${rawTensor.shape}`);

    // ==========================================================
    // TEST 1: QUALITY MODEL (EfficientNetB0)
    // ==========================================================
    console.log("\n---------------------------------------------");
    console.log("🔍 Testing Quality Model...");
    try {
        const qualityModelUrl = `file://${path.join(MODEL_DIR, 'iqa_model', 'model.json')}`;
        const qualityLabelsPath = path.join(MODEL_DIR, 'iqa_labels.json');
        
        const qualityModel = await tf.loadGraphModel(qualityModelUrl);
        const qualityLabels = JSON.parse(fs.readFileSync(qualityLabelsPath));

        // Preprocessing: Resize to 224x224 & Normalize to 0-1
        let qualityInput = tf.image.resizeBilinear(rawTensor, [224, 224]);
        qualityInput = qualityInput.div(255.0); // Normalize to [0, 1]
        qualityInput = qualityInput.expandDims(0); // Add batch dimension [1, 224, 224, 3]

        const qualityPred = qualityModel.execute(qualityInput);
        const qualityProbs = Array.from(qualityPred.dataSync());
        
        // Find best class
        const maxProb = Math.max(...qualityProbs);
        const bestIndex = qualityProbs.indexOf(maxProb);
        
        console.log(`✅ Prediction: ${qualityLabels[bestIndex]} (${(maxProb * 100).toFixed(1)}%)`);
        
        // Optional: Check if it's "Good Foot Picture" before proceeding
        if (qualityLabels[bestIndex] !== "Good Foot Picture") {
            console.warn("⚠️ Warning: Image flagged as poor quality. Condition results might be inaccurate.");
        }
    } catch (e) {
        console.error("❌ Quality Model Failed:", e.message);
    }

    // ==========================================================
    // TEST 2: CONDITION MODEL (EfficientNetB3 - Multi-label)
    // ==========================================================
    console.log("\n---------------------------------------------");
    console.log("🩺 Testing Condition Model...");
    try {
        const conditionModelUrl = `file://${path.join(MODEL_DIR, 'condition_model', 'model.json')}`;
        const conditionLabelsPath = path.join(MODEL_DIR, 'condition_labels.json');

        const conditionModel = await tf.loadGraphModel(conditionModelUrl);
        const conditionLabels = JSON.parse(fs.readFileSync(conditionLabelsPath));

        // Preprocessing: Resize to 300x300 & Keep range 0-255
        // (EfficientNetB3 usually expects 0-255 floats)
        let conditionInput = tf.image.resizeBilinear(rawTensor, [300, 300]);
        conditionInput = conditionInput.cast('float32'); // [0-255] range
        conditionInput = conditionInput.expandDims(0);

        const conditionPred = conditionModel.execute(conditionInput);
        const conditionProbs = Array.from(conditionPred.dataSync());

        console.log("📋 Probabilities:");
        const results = conditionLabels.map((label, i) => ({
            label,
            score: conditionProbs[i]
        }));

        // Sort by score
        results.sort((a, b) => b.score - a.score);

        // Print top 3
        results.slice(0, 3).forEach(r => {
            const bar = "█".repeat(Math.round(r.score * 10));
            console.log(`   ${bar} ${(r.score * 100).toFixed(1)}%  ${r.label}`);
        });

    } catch (e) {
        console.error("❌ Condition Model Failed:", e.message);
    }
}

loadAndPredict();