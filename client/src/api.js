const API_BASE = import.meta.env.DEV ? '/api' : `${import.meta.env.VITE_API_URL || ''}/api`;

/**
 * Step 1: Fetches media metadata and available format options
 * @param {string} url - Media URL
 */
export async function fetchMediaInfo(url) {
  const response = await fetch(`${API_BASE}/info`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch media details.');
  }

  return data;
}

/**
 * Step 2: Triggers download with chosen media type (video/audio) and quality format options
 * @param {Object} payload - { url, type, formatId, audioFormat, audioQuality }
 */
export async function triggerDownload(payload) {
  const response = await fetch(`${API_BASE}/download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to process download.');
  }

  return data;
}

/**
 * Fetches recent download history records
 */
export async function fetchHistory() {
  const response = await fetch(`${API_BASE}/history`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to load history.');
  }

  return data;
}

/**
 * Deletes a history item record and associated file
 * @param {string} id - The MongoDB record ID
 */
export async function deleteHistoryItem(id) {
  const response = await fetch(`${API_BASE}/history/${id}`, {
    method: 'DELETE'
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete record.');
  }

  return data;
}

/**
 * Generates direct download URL for a saved file
 * @param {string} filename 
 */
export function getFileUrl(filename) {
  return `${API_BASE}/file/${encodeURIComponent(filename)}`;
}
