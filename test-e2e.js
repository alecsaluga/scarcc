#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://scarcc.vercel.app';
const VIDEO_PATH = '/Users/alecsaluga/Desktop/SCARVIDS/ScreenRecording_04-18-2026 21-31-15_1 (2).mov';

async function test() {
  const startTime = Date.now();
  const log = (msg) => console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ${msg}`);

  try {
    log('=== E2E TEST START ===');

    // Check video file exists
    if (!fs.existsSync(VIDEO_PATH)) {
      throw new Error(`Video not found: ${VIDEO_PATH}`);
    }
    const videoBuffer = fs.readFileSync(VIDEO_PATH);
    const videoSize = videoBuffer.length;
    log(`Video loaded: ${(videoSize / 1024 / 1024).toFixed(2)} MB`);

    // Step 1: Get upload token
    log('Step 1: Getting upload token...');
    const tokenPayload = {
      type: 'blob.generate-client-token',
      payload: {
        pathname: `test_${Date.now()}.mov`,
        callbackUrl: `${SITE_URL}/api/upload-token`,
        clientPayload: null,
        multipart: false
      }
    };

    const tokenRes = await fetch(`${SITE_URL}/api/upload-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tokenPayload)
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      throw new Error(`Token request failed (${tokenRes.status}): ${text}`);
    }

    const tokenData = await tokenRes.json();
    log(`Token received: ${tokenData.clientToken ? 'YES' : 'NO'}`);

    if (!tokenData.clientToken) {
      throw new Error(`No client token in response: ${JSON.stringify(tokenData)}`);
    }

    // Step 2: Upload to Blob storage
    log('Step 2: Uploading to Blob storage...');
    const uploadUrl = `https://blob.vercel-storage.com/${tokenPayload.payload.pathname}`;

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenData.clientToken}`,
        'Content-Type': 'video/quicktime',
        'x-vercel-blob-add-random-suffix': 'true'
      },
      body: videoBuffer
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      throw new Error(`Upload failed (${uploadRes.status}): ${text}`);
    }

    const uploadData = await uploadRes.json();
    log(`Upload complete: ${uploadData.url}`);

    // Step 3: Process video
    log('Step 3: Processing video with Gemini...');
    const processRes = await fetch(`${SITE_URL}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E2E Test User',
        tiktokHandle: 'e2e_test_' + Date.now(),
        videos: [{
          url: uploadData.url,
          filename: 'test.mov',
          size: videoSize,
          contentType: 'video/quicktime'
        }]
      })
    });

    log(`Process response status: ${processRes.status}`);

    if (processRes.status === 504) {
      throw new Error('TIMEOUT - Function exceeded time limit');
    }

    const processText = await processRes.text();
    log(`Process response length: ${processText.length} chars`);

    let processData;
    try {
      processData = JSON.parse(processText);
    } catch {
      throw new Error(`Invalid JSON response: ${processText.substring(0, 500)}`);
    }

    if (!processRes.ok) {
      throw new Error(`Process failed: ${processData.error || processText}`);
    }

    log('=== SUCCESS ===');
    log(`Products extracted: ${processData.productsExtracted}`);
    log(`Opportunities created: ${processData.opportunitiesCreated}`);
    log(`Portal URL: ${processData.creator?.portalUrl}`);

    console.log('\nFull response:', JSON.stringify(processData, null, 2));

  } catch (error) {
    log(`=== FAILED ===`);
    log(`Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

test();
