import weaviate, { EmbeddedOptions } from 'weaviate-ts-embedded';

const embeddedOptions = new EmbeddedOptions({
    port: 8080,
    env: {
        DEFAULT_VECTORIZER_MODULE: 'none',
    },
});

// Since we are in ESM, we initialize the client like this:
const client = weaviate.client(embeddedOptions, {
    host: 'localhost:8080',
    scheme: 'http'
});

async function test() {
    try {
        console.log("🚀 Attempting to boot Weaviate in Linux native space...");

        // This will trigger the download of the Linux binary on the first run
        await client.embedded.start();

        console.log("✅ Success! Weaviate is running locally on port 8080.");

        // We stop it now just to confirm the lifecycle works
        await client.embedded.stop();
        console.log("Shutting down test instance.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to start Weaviate:", error);
        process.exit(1);
    }
}

test();