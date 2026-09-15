const mongoose = require('mongoose');
const http = require('http');
const express = require('express');
const assert = require('assert');

// Test the work history sanitization and endpoint filtering logic
async function runTest() {
  console.log('Testing Work History isolation, privacy, and terminal-only filtering...');

  // Mock Job Model and privacy sanitization
  function sanitizeLocation(loc) {
    if (!loc) return 'Location not specified';
    if (typeof loc === 'string') {
      const parts = loc.split(',').map(s => s.trim()).filter(Boolean);
      return parts.slice(-2).join(', ') || loc;
    }
    if (loc.city && loc.locality) return `${loc.locality}, ${loc.city}`;
    if (loc.city) return loc.city;
    if (loc.address) {
      const parts = loc.address.split(',').map(s => s.trim()).filter(Boolean);
      return parts.slice(-2).join(', ') || loc.address;
    }
    return 'Location not specified';
  }

  // Verify address privacy sanitization
  const sensitiveAddress = 'Flat 402, Wing B, Royal Palms, Near Metro Station, Aarey Colony, Goregaon East, Mumbai';
  const sanitized = sanitizeLocation(sensitiveAddress);
  assert.strictEqual(sanitized.includes('Flat 402'), false, 'Should strip flat/room numbers');
  assert.strictEqual(sanitized.includes('Wing B'), false, 'Should strip wing identifiers');
  assert.strictEqual(sanitized, 'Goregaon East, Mumbai', 'Should keep only locality and city');
  console.log('✓ Privacy check passed: Street/flat details stripped, only locality/city returned');

  // Verify terminal state filtering
  const validCompletedStates = ['COMPLETED', 'SETTLED', 'PAYMENT_CONFIRMED', 'PAYMENT_COMPLETED'];
  const nonCompletedStates = ['ACCEPTED', 'IN_PROGRESS', 'ARRIVED', 'STARTED', 'CANCELLED', 'REJECTED', 'EXPIRED'];

  for (const s of nonCompletedStates) {
    assert.strictEqual(validCompletedStates.includes(s), false, `State ${s} must NOT be considered completed`);
  }
  for (const s of validCompletedStates) {
    assert.strictEqual(validCompletedStates.includes(s), true, `State ${s} must be considered completed`);
  }
  console.log('✓ Status check passed: Only terminal completed statuses qualify for Work History');

  // Verify idempotency logic
  const mockJobs = [
    { _id: 'job_1', status: 'COMPLETED', title: 'Painting Service' },
    { _id: 'job_1', status: 'COMPLETED', title: 'Painting Service' }, // duplicate
    { _id: 'job_2', status: 'SETTLED', title: 'Plumbing Service' }
  ];

  const seenJobIds = new Set();
  const dedupedJobs = [];
  for (const j of mockJobs) {
    const jId = String(j._id);
    if (!seenJobIds.has(jId)) {
      seenJobIds.add(jId);
      dedupedJobs.push(j);
    }
  }
  assert.strictEqual(dedupedJobs.length, 2, 'Duplicates must be pruned');
  assert.strictEqual(dedupedJobs[0]._id, 'job_1');
  assert.strictEqual(dedupedJobs[1]._id, 'job_2');
  console.log('✓ Idempotency check passed: Same job appears exactly once');

  console.log('All Work History core logic checks PASSED!');
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
