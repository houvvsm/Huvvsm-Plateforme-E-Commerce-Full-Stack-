import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash', generationConfig: { responseMimeType: 'application/json' } });
try {
  console.log('Testing with key:', process.env.GEMINI_API_KEY?.substring(0, 15) + '...');
  const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: 'respond with valid json: {"response":"hi","escalate":false}' }] }] });
  console.log('SUCCESS:', result.response.text());
} catch (err) {
  console.log('ERROR STATUS:', err.status);
  console.log('ERROR MSG:', err.message?.substring(0, 500));
}
