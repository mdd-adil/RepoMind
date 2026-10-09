import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // 2 minutes for large downloads/analysis
});

export const analyzeRepo = async (repoUrl) => {
  const res = await api.post('/repos/analyze', { repoUrl });
  return res.data;
};

export const uploadRepoZip = async (file) => {
  const formData = new FormData();
  formData.append('zipFile', file);
  const res = await api.post('/repos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const getRepos = async () => {
  const res = await api.get('/repos');
  return res.data;
};

export const getRepo = async (id) => {
  const res = await api.get(`/repos/${id}`);
  return res.data;
};

export const getGraph = async (repoId) => {
  const res = await api.get(`/repos/${repoId}/graph`);
  return res.data;
};

export const getModule = async (moduleId) => {
  const res = await api.get(`/modules/${moduleId}`);
  return res.data;
};
