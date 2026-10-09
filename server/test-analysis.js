import { analyzeRepository } from './src/services/analyzer.js';

const mockFiles = [
  {
    path: 'src/index.js',
    name: 'index.js',
    ext: '.js',
    size: 512,
    content: `
      import express from 'express';
      import { authRouter } from './routes/auth.js';
      import { UserService } from './services/userService.js';

      const app = express();
      app.use('/auth', authRouter);
      export const server = app;
    `
  },
  {
    path: 'src/routes/auth.js',
    name: 'auth.js',
    ext: '.js',
    size: 400,
    content: `
      import { Router } from 'express';
      import { loginController } from '../controllers/authController.js';

      export const authRouter = Router();
      authRouter.post('/login', loginController);
    `
  },
  {
    path: 'src/controllers/authController.js',
    name: 'authController.js',
    ext: '.js',
    size: 450,
    content: `
      import { UserService } from '../services/userService.js';

      export async function loginController(req, res) {
        const user = await UserService.authenticate(req.body);
        return res.json({ token: user.token });
      }
    `
  },
  {
    path: 'src/services/userService.js',
    name: 'userService.js',
    ext: '.js',
    size: 600,
    content: `
      import { hashPassword } from '../utils/crypto.js';

      export class UserService {
        static async authenticate(creds) {
          return { id: 1, token: 'mock-jwt-token' };
        }
      }
    `
  },
  {
    path: 'src/utils/crypto.js',
    name: 'crypto.js',
    ext: '.js',
    size: 300,
    content: `
      export function hashPassword(raw) {
        return 'hashed_' + raw;
      }
    `
  }
];

console.log('Running AST analysis verification on mock multi-layer project...');
const result = analyzeRepository(mockFiles);

console.log('Analyzed modules:', result.modules.length);
console.log('Dependencies found:', result.dependencies.length);
console.log('Layers identified:', result.metrics.layerBreakdown);
console.log('Hubs:', result.metrics.topHubs);

result.dependencies.forEach(d => {
  console.log(`  -> ${d.sourcePath} imports ${d.targetPath} (${d.specifiers.join(', ')})`);
});

if (result.modules.length === 5 && result.dependencies.length >= 4) {
  console.log('✅ AST Analyzer Verification PASSED!');
} else {
  console.error('❌ AST Analyzer Verification FAILED');
  process.exit(1);
}
