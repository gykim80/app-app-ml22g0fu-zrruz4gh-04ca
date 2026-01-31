// Davinci DB SDK - Zero-Config Database Client
const APP_ID = import.meta.env.VITE_APP_ID;
const API_URL = import.meta.env.VITE_DAVINCI_API_URL || 'https://davinci.vercel.app';

async function callAPI(collection, action, params = {}) {
  if (!APP_ID) {
    throw new Error('VITE_APP_ID is not configured. Deploy to enable database.');
  }

  const response = await fetch(`${API_URL}/api/app-db/${APP_ID}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collection, action, ...params }),
  });

  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Database error');
  return result;
}

// Collection class for Firestore-style API
class Collection {
  constructor(name) { this.name = name; }

  async getAll(options) { return callAPI(this.name, 'select', { options }); }
  async find(filter, options) { return callAPI(this.name, 'select', { filter, options }); }
  async findById(id) {
    const result = await callAPI(this.name, 'select', { filter: { id }, options: { limit: 1 } });
    return { success: result.success, data: result.data?.[0], error: result.error };
  }
  async add(data) {
    const result = await callAPI(this.name, 'insert', { data });
    return { success: result.success, data: result.data?.[0], error: result.error };
  }
  async addMany(data) { return callAPI(this.name, 'insert', { data }); }
  async updateById(id, data) {
    const result = await callAPI(this.name, 'update', { filter: { id }, data });
    return { success: result.success, data: result.data?.[0], error: result.error };
  }
  async update(filter, data) { return callAPI(this.name, 'update', { filter, data }); }
  async deleteById(id) { return callAPI(this.name, 'delete', { filter: { id } }); }
  async delete(filter) { return callAPI(this.name, 'delete', { filter }); }
  async count(filter) { return callAPI(this.name, 'count', { filter }); }
}

// Davinci DB Client
export const db = {
  collection(name) { return new Collection(name); },
  get isConfigured() { return Boolean(APP_ID); },
};

export default db;