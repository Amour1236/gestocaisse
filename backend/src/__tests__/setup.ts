import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Valeurs par défaut si .env absent (CI/CD)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_for_jest';
process.env.NODE_ENV = 'test';
