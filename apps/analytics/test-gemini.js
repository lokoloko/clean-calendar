// Quick test script to verify Gemini API is working
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load the API key
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

if (!apiKey) {
  console.error('❌ No API key found in environment variables');
  process.exit(1);
}

console.log('✅ API Key found:', apiKey.substring(0, 10) + '...');

async function testGemini() {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    console.log('🤖 Testing Gemini API...');
    
    const prompt = 'Say "Hello from Gemini!" if you are working correctly.';
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Gemini Response:', text);
    console.log('\n🎉 Gemini API is working correctly!');
    console.log('Your analytics app will now have AI-powered insights.');
  } catch (error) {
    console.error('❌ Error testing Gemini:', error.message);
    if (error.message.includes('API_KEY')) {
      console.log('Check that your API key is valid and activated.');
    }
  }
}

testGemini();