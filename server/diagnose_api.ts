import 'dotenv/config';

async function diagnoseModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API Key found in .env");
    return;
  }

  const versions = ['v1', 'v1beta'];
  
  for (const v of versions) {
    console.log(`\n--- Checking API Version: ${v} ---`);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/${v}/models?key=${apiKey}`);
      const data = await response.json();
      
      if (data.error) {
        console.log(`Error ${v}: ${data.error.message}`);
        continue;
      }

      if (data.models) {
        console.log(`Found ${data.models.length} models:`);
        data.models.forEach((m: any) => {
          const supportsGenerate = m.supportedGenerationMethods.includes('generateContent');
          console.log(`- ${m.name} [${supportsGenerate ? 'GENERATE' : 'OTHER'}]`);
        });
      }
    } catch (error) {
      console.error(`Failed to fetch ${v}:`, error);
    }
  }
}

diagnoseModels();
