import { parseGithubUrl, fetchRepoMetadata, fetchRepoZip } from './src/services/githubService.js';
import { extractFilesFromZip } from './src/services/zipService.js';
import { analyzeRepository } from './src/services/analyzer.js';

async function test() {
  const testUrl = 'https://github.com/facebook/flux';
  console.log('Testing GitHub download for:', testUrl);

  const { owner, repo } = parseGithubUrl(testUrl);
  console.log('Parsed:', { owner, repo });

  const meta = await fetchRepoMetadata(owner, repo);
  console.log('Meta:', meta);

  const { zip, branchUsed } = await fetchRepoZip(owner, repo, meta.default_branch);
  console.log('Downloaded zip via branch:', branchUsed);

  const files = extractFilesFromZip(zip);
  console.log('Extracted files count:', files.length);

  const analysis = analyzeRepository(files);
  console.log('Modules analyzed:', analysis.modules.length);
  console.log('Dependencies:', analysis.dependencies.length);
  console.log('Top hubs:', analysis.metrics.topHubs);
}

test().catch(err => {
  console.error('Test error:', err);
});
