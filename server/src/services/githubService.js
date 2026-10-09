import axios from 'axios';
import AdmZip from 'adm-zip';

export function parseGithubUrl(url) {
  try {
    let cleanUrl = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
    
    // Support "owner/repo" directly
    if (!cleanUrl.includes('github.com') && /^[\w.-]+\/[\w.-]+$/.test(cleanUrl)) {
      const [owner, repo] = cleanUrl.split('/');
      return { owner, repo };
    }

    const match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/i);
    if (!match) {
      throw new Error('Invalid GitHub repository URL. Expected format: https://github.com/owner/repo or owner/repo');
    }
    return {
      owner: match[1],
      repo: match[2],
    };
  } catch (err) {
    throw new Error('Failed to parse GitHub URL: ' + err.message);
  }
}

export async function fetchRepoMetadata(owner, repo) {
  try {
    const headers = {
      'User-Agent': 'RepoVisualizer-Tool',
      Accept: 'application/vnd.github.v3+json',
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      timeout: 15000,
      maxRedirects: 5,
    });

    const data = response.data;
    return {
      name: data.name,
      owner: data.owner?.login || owner,
      description: data.description || 'No description provided.',
      stars: data.stargazers_count || 0,
      default_branch: data.default_branch || 'main',
      primary_language: data.language || 'JavaScript',
      html_url: data.html_url || `https://github.com/${owner}/${repo}`,
    };
  } catch (err) {
    console.warn(`GitHub API metadata fetch failed for ${owner}/${repo}: ${err.message}. Using defaults.`);
    return {
      name: repo,
      owner,
      description: 'Repository analyzed via direct source download.',
      stars: 0,
      default_branch: 'main',
      primary_language: 'JavaScript',
      html_url: `https://github.com/${owner}/${repo}`,
    };
  }
}

export async function fetchRepoZip(owner, repo, branch = 'main') {
  const branchesToTry = [branch, 'main', 'master'].filter(Boolean);
  const uniqueBranches = Array.from(new Set(branchesToTry));
  let lastError = null;

  for (const b of uniqueBranches) {
    const downloadUrls = [
      `https://github.com/${owner}/${repo}/archive/refs/heads/${b}.zip`,
      `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${b}`,
      `https://github.com/${owner}/${repo}/archive/${b}.zip`,
    ];

    for (const zipUrl of downloadUrls) {
      try {
        console.log(`Attempting to download repo archive: ${zipUrl}`);
        const response = await axios.get(zipUrl, {
          responseType: 'arraybuffer',
          timeout: 45000,
          maxRedirects: 10,
          headers: {
            'User-Agent': 'RepoVisualizer-Tool',
            'Accept': 'application/zip, application/octet-stream, */*',
          },
        });

        if (response.data && response.data.byteLength > 100) {
          const zip = new AdmZip(Buffer.from(response.data));
          return { zip, branchUsed: b };
        }
      } catch (err) {
        lastError = err;
        console.warn(`Could not download from ${zipUrl}: ${err.message}`);
      }
    }
  }

  // Fallback to github api zipball
  try {
    const apiZipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball`;
    console.log(`Attempting fallback to GitHub API zipball: ${apiZipUrl}`);
    const headers = { 'User-Agent': 'RepoVisualizer-Tool' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    const response = await axios.get(apiZipUrl, {
      responseType: 'arraybuffer',
      timeout: 45000,
      headers,
    });
    const zip = new AdmZip(Buffer.from(response.data));
    return { zip, branchUsed: 'default' };
  } catch (err) {
    throw new Error(`Failed to download repository zip archive: ${lastError?.message || err.message}`);
  }
}
