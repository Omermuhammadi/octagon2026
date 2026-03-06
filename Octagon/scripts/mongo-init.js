// MongoDB Initialization Script for Octagon Oracle
// This script runs automatically when the MongoDB container starts for the first time

print('🥊 Initializing Octagon Oracle Database...');

// Switch to the octagon-oracle database
db = db.getSiblingDB('octagon-oracle');

// Create collections with indexes for optimal performance
print('📦 Creating collections...');

// Users collection
db.createCollection('users');
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
print('✅ Users collection created with indexes');

// Fighters collection
db.createCollection('fighters');
db.fighters.createIndex({ name: 'text', nickname: 'text' });
db.fighters.createIndex({ weightClass: 1 });
db.fighters.createIndex({ fighterId: 1 }, { unique: true, sparse: true });
print('✅ Fighters collection created with indexes');

// Events collection
db.createCollection('events');
db.events.createIndex({ name: 'text', location: 'text' });
db.events.createIndex({ date: -1 });
db.events.createIndex({ status: 1 });
db.events.createIndex({ eventId: 1 }, { unique: true, sparse: true });
print('✅ Events collection created with indexes');

// Fight Stats collection
db.createCollection('fightstats');
db.fightstats.createIndex({ fighterId: 1 });
db.fightstats.createIndex({ eventId: 1 });
db.fightstats.createIndex({ date: -1 });
print('✅ Fight Stats collection created with indexes');

print('');
print('🎉 Octagon Oracle Database initialized successfully!');
print('📊 Collections created: users, fighters, events, fightstats');
print('');
