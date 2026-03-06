import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { config } from '../config';
import { Fighter, Event, FightStats } from '../models';

// Determine the data directory path (works in both dev and production)
// In dev: src/scripts/importData.ts -> ../../data
// In prod: dist/scripts/importData.js -> ../../data (data folder copied to root)
const getDataPath = (filename: string): string => {
  // First try relative to project root (production Docker setup)
  const rootPath = path.join(process.cwd(), 'data', filename);
  if (fs.existsSync(rootPath)) {
    return rootPath;
  }
  // Fallback to relative to __dirname (development)
  return path.join(__dirname, '../../data', filename);
};

// CSV parsing helper
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  // Parse rows
  const records: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const record: Record<string, string> = {};
      headers.forEach((header, idx) => {
        record[header] = values[idx];
      });
      records.push(record);
    }
  }
  return records;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const parseDate = (dateStr: string): Date | null => {
  if (!dateStr || dateStr === '--' || dateStr === '') return null;
  try {
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
};

const parseNumber = (value: string): number => {
  if (!value || value === '' || value === '--') return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

const parseStrikeStatFromCSV = (value: string): { landed: number; attempted: number } => {
  if (!value || value === '---' || value === '') return { landed: 0, attempted: 0 };
  const parts = value.split(' of ');
  if (parts.length !== 2) return { landed: 0, attempted: 0 };
  return {
    landed: parseInt(parts[0]) || 0,
    attempted: parseInt(parts[1]) || 0,
  };
};

const parsePct = (value: string): number => {
  if (!value || value === '---' || value === '') return 0;
  return parseFloat(value.replace('%', '')) || 0;
};

async function importFighters() {
  console.log('📥 Importing fighters...');
  const filePath = getDataPath('fighters.csv');
  console.log(`  Reading from: ${filePath}`);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  const records = parseCSV(fileContent);
  console.log(`  Found ${records.length} fighter records`);

  let count = 0;
  let errors = 0;
  
  for (const row of records) {
    try {
      await Fighter.findOneAndUpdate(
        { url: row.url },
        {
          url: row.url,
          name: row.name || '',
          nickname: row.nickname || '',
          wins: parseNumber(row.wins),
          losses: parseNumber(row.losses),
          draws: parseNumber(row.draws),
          height: row.height || '',
          weight: row.weight || '',
          reach: row.reach ? parseNumber(row.reach) : null,
          stance: row.stance || '',
          dob: parseDate(row.dob),
          slpm: parseNumber(row.slpm),
          strikingAccuracy: parseNumber(row.striking_accuracy),
          sapm: parseNumber(row.sapm),
          strikingDefense: parseNumber(row.striking_defense),
          takedownAvg: parseNumber(row.takedown_avg),
          takedownAccuracy: parseNumber(row.takedown_accuracy),
          takedownDefense: parseNumber(row.takedown_defense),
          submissionAvg: parseNumber(row.submission_avg),
          scrapedDate: parseDate(row.scraped_date) || new Date(),
        },
        { upsert: true, new: true }
      );
      count++;
      if (count % 500 === 0) console.log(`  Processed ${count} fighters...`);
    } catch (error) {
      errors++;
      if (errors < 5) console.error(`  Error importing fighter ${row.name}:`, error);
    }
  }
  console.log(`✅ Imported ${count} fighters (${errors} errors)`);
}

async function importEvents() {
  console.log('📥 Importing events...');
  const filePath = getDataPath('events.csv');
  console.log(`  Reading from: ${filePath}`);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  const records = parseCSV(fileContent);
  console.log(`  Found ${records.length} event records`);

  const today = new Date();
  let count = 0;
  let errors = 0;
  
  for (const row of records) {
    try {
      const eventDate = parseDate(row.date);
      const status = eventDate && eventDate > today ? 'upcoming' : 'completed';
      
      await Event.findOneAndUpdate(
        { eventId: row.event_id },
        {
          url: row.url,
          eventId: row.event_id,
          name: row.event_name,
          date: eventDate,
          location: row.location || '',
          status,
        },
        { upsert: true, new: true }
      );
      count++;
    } catch (error) {
      errors++;
      if (errors < 5) console.error(`  Error importing event ${row.event_name}:`, error);
    }
  }
  console.log(`✅ Imported ${count} events (${errors} errors)`);
}

async function importFightStats() {
  console.log('📥 Importing fight stats...');
  const filePath = getDataPath('fightstats.csv');
  console.log(`  Reading from: ${filePath}`);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  const records = parseCSV(fileContent);
  console.log(`  Found ${records.length} fight stat records`);

  let count = 0;
  let errors = 0;
  
  for (const row of records) {
    try {
      await FightStats.findOneAndUpdate(
        { fightId: row.fight_id, fighterName: row.fighter_name },
        {
          fightId: row.fight_id,
          fighterName: row.fighter_name,
          fighterPosition: parseNumber(row.fighter_position),
          knockdowns: parseNumber(row.knockdowns),
          sigStrikes: parseStrikeStatFromCSV(row.sig_strikes),
          sigStrikesPct: parsePct(row.sig_strikes_pct),
          totalStrikes: parseStrikeStatFromCSV(row.total_strikes),
          takedowns: parseStrikeStatFromCSV(row.takedowns),
          takedownPct: parsePct(row.takedown_pct),
          submissionAttempts: parseNumber(row.submission_attempts),
          reversals: parseNumber(row.reversals),
          controlTime: row.control_time || '0:00',
          sigStrikesHead: parseStrikeStatFromCSV(row.sig_strikes_head),
          sigStrikesBody: parseStrikeStatFromCSV(row.sig_strikes_body),
          sigStrikesLeg: parseStrikeStatFromCSV(row.sig_strikes_leg),
          sigStrikesDistance: parseStrikeStatFromCSV(row.sig_strikes_distance),
          sigStrikesClinch: parseStrikeStatFromCSV(row.sig_strikes_clinch),
          sigStrikesGround: parseStrikeStatFromCSV(row.sig_strikes_ground),
        },
        { upsert: true, new: true }
      );
      count++;
      if (count % 2000 === 0) console.log(`  Processed ${count} fight stats...`);
    } catch (error) {
      errors++;
      if (errors < 5) console.error(`  Error importing fight stat:`, error);
    }
  }
  console.log(`✅ Imported ${count} fight stats (${errors} errors)`);
}

async function main() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    console.log(`  URI: ${config.mongodbUri}`);
    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data (optional - comment out to append)
    console.log('🗑️  Clearing existing data...');
    await Fighter.deleteMany({});
    await Event.deleteMany({});
    await FightStats.deleteMany({});
    console.log('✅ Cleared existing data\n');

    await importFighters();
    console.log('');
    await importEvents();
    console.log('');
    await importFightStats();

    console.log('\n🎉 All data imported successfully!');
    
    // Print summary
    const fighterCount = await Fighter.countDocuments();
    const eventCount = await Event.countDocuments();
    const fightStatsCount = await FightStats.countDocuments();
    
    console.log('\n📊 Database Summary:');
    console.log(`  Fighters: ${fighterCount}`);
    console.log(`  Events: ${eventCount}`);
    console.log(`  Fight Stats: ${fightStatsCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

main();
